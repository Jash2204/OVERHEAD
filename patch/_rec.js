// ════════════════════════════════════════════════════════════════════
// OVERHEAD v7.5 "TIMELAPSE" — Record Sky
// Captures the clean sky canvas (#cv) as a true time-lapse video and
// streams it straight to the user's Downloads folder.
//
//   frame grab (every Ns)  ->  WebCodecs VideoEncoder (VP9/AV1)
//        ->  webm-muxer (streaming)  ->  durable OPFS sync-access-handle
//
// Because every encoded chunk is flushed to an Origin-Private-File-System
// file as it is produced, an unexpectedly closed tab leaves a valid,
// recoverable .webm behind — OVERHEAD offers to save it on next launch.
//
// Tiers (auto-selected by capability):
//   1  WebCodecs + OPFS worker  — true time-lapse, tiny files, crash-safe
//   2  WebCodecs, no OPFS       — true time-lapse, in-memory, save on stop
//   3  MediaRecorder fallback   — real-time clip, in-memory, save on stop
//
// Inlined muxer: webm-muxer (MIT) © Vanilagy. Full credit in README.
// ════════════════════════════════════════════════════════════════════
(function(){
  if (typeof IS_OUTPUT !== 'undefined' && IS_OUTPUT) return; // control window only

  var LS_MARK = 'overhead-rec';       // crash-recovery marker
  var LS_CFG  = 'overhead-rec-cfg';   // persisted settings
  var OPFS_NAME = 'overhead-rec.webm';

  var QBPP = { small:0.025, balanced:0.05, crisp:0.09 };

  var REC = {
    active:false, busy:false, tier:0,
    frameIndex:0, startMs:0, lastCap:-1e12, bytes:0,
    w:0, h:0,
    // settings (defaults)
    capMs:2000, playFps:30, resLong:1280, quality:'balanced', codec:'vp9',
    // engine handles
    encoder:null, muxer:null, worker:null, scratch:null, sctx:null,
    memChunks:null, mediaRec:null, mediaBlobs:null, recWorker:null
  };

  var haveWebCodecs = ('VideoEncoder' in window) && ('VideoFrame' in window);
  var haveOPFS = !!(navigator.storage && navigator.storage.getDirectory)
                 && window.isSecureContext && (typeof Worker !== 'undefined');

  // ── settings persistence ─────────────────────────────────────────
  function loadCfg(){
    try{
      var s = JSON.parse(localStorage.getItem(LS_CFG) || '{}');
      if(s.capMs)   REC.capMs   = +s.capMs;
      if(s.playFps) REC.playFps = +s.playFps;
      if(s.resLong) REC.resLong = +s.resLong;
      if(s.quality) REC.quality = s.quality;
      if(s.codec)   REC.codec   = s.codec;
    }catch(e){}
  }
  function saveCfg(){
    try{ localStorage.setItem(LS_CFG, JSON.stringify({
      capMs:REC.capMs, playFps:REC.playFps, resLong:REC.resLong,
      quality:REC.quality, codec:REC.codec
    })); }catch(e){}
  }

  // ── small helpers ────────────────────────────────────────────────
  function even(n){ n = Math.round(n); return (n % 2) ? n+1 : n; }
  function targetDims(){
    var aw = window.innerWidth, ah = window.innerHeight, w, h;
    if(aw >= ah){ w = REC.resLong; h = REC.resLong * ah / aw; }
    else        { h = REC.resLong; w = REC.resLong * aw / ah; }
    return { w: even(Math.max(2,w)), h: even(Math.max(2,h)) };
  }
  function bitrateFor(w,h){
    return Math.max(300000, Math.round(w*h*REC.playFps*(QBPP[REC.quality]||0.05)));
  }
  function speedup(){ return Math.max(1, Math.round(REC.playFps * REC.capMs / 1000)); }
  function fmtBytes(b){
    if(b < 1024) return b + ' B';
    if(b < 1048576) return (b/1024).toFixed(0) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }
  function fmtClock(sec){
    var m = Math.floor(sec/60), s = sec%60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }
  function stampFrom(d){
    d = d || new Date(); var p = function(n){ return String(n).padStart(2,'0'); };
    return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '-' +
           p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }
  function toast(t,m,c){ if(typeof ohToast === 'function') ohToast(t,m,c); }

  function download(blob, name){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); }, 4000);
  }

  // ── codec pick (feature-detected) ────────────────────────────────
  function pickCodec(w,h){
    var want = (REC.codec === 'av1')
      ? [['av01.0.08M.08','V_AV1'],['av01.0.04M.08','V_AV1'],['vp09.00.10.08','V_VP9'],['vp09.00.31.08','V_VP9']]
      : [['vp09.00.10.08','V_VP9'],['vp09.00.31.08','V_VP9'],['av01.0.04M.08','V_AV1']];
    var i = 0;
    function next(){
      if(i >= want.length) return Promise.resolve(null);
      var entry = want[i++];
      return VideoEncoder.isConfigSupported({
        codec: entry[0], width:w, height:h, bitrate:bitrateFor(w,h), framerate:REC.playFps
      }).then(function(sup){
        if(sup && sup.supported) return { codec:entry[0], mux:entry[1] };
        return next();
      }).catch(next);
    }
    return next();
  }

  // ── durable OPFS write worker (inline blob) ──────────────────────
  var WORKER_SRC = [
    'let ah=null;',
    'self.onmessage=async(e)=>{const m=e.data;try{',
    '  if(m.type==="open"){const r=await navigator.storage.getDirectory();',
    '    const fh=await r.getFileHandle(m.name,{create:true});',
    '    ah=await fh.createSyncAccessHandle();ah.truncate(0);ah.flush();',
    '    self.postMessage({type:"opened"});}',
    '  else if(m.type==="write"){ah.write(new Uint8Array(m.data),{at:m.position});ah.flush();}',
    '  else if(m.type==="stop"){ah.flush();const size=ah.getSize();',
    '    const buf=new ArrayBuffer(size);ah.read(new Uint8Array(buf),{at:0});ah.close();ah=null;',
    '    self.postMessage({type:"stopped",buffer:buf,size},[buf]);}',
    '  else if(m.type==="probe"){const r=await navigator.storage.getDirectory();',
    '    try{const fh=await r.getFileHandle(m.name);const f=await fh.getFile();',
    '      self.postMessage({type:"probed",exists:f.size>0,size:f.size});}',
    '    catch(_){self.postMessage({type:"probed",exists:false,size:0});}}',
    '  else if(m.type==="read"){const r=await navigator.storage.getDirectory();',
    '    const fh=await r.getFileHandle(m.name);const f=await fh.getFile();',
    '    const buf=await f.arrayBuffer();',
    '    self.postMessage({type:"readdata",buffer:buf,size:buf.byteLength},[buf]);}',
    '  else if(m.type==="delete"){const r=await navigator.storage.getDirectory();',
    '    await r.removeEntry(m.name).catch(()=>{});self.postMessage({type:"deleted"});}',
    '}catch(err){self.postMessage({type:"error",error:String((err&&err.message)||err)});}};'
  ].join('\n');

  function makeWorker(){
    var blob = new Blob([WORKER_SRC], { type:'text/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
  function workerCall(worker, msg, transfer, expect){
    return new Promise(function(res, rej){
      function onmsg(e){
        if(e.data.type === expect){ worker.removeEventListener('message', onmsg); res(e.data); }
        else if(e.data.type === 'error'){ worker.removeEventListener('message', onmsg); rej(new Error(e.data.error)); }
      }
      worker.addEventListener('message', onmsg);
      worker.postMessage(msg, transfer || []);
    });
  }

  // ── START ────────────────────────────────────────────────────────
  function start(){
    loadCfg();
    var d = targetDims(); REC.w = d.w; REC.h = d.h;
    REC.frameIndex = 0; REC.bytes = 0; REC.startMs = performance.now(); REC.lastCap = -1e12;
    REC.pending = null;
    REC.scratch = document.createElement('canvas');
    REC.scratch.width = REC.w; REC.scratch.height = REC.h;
    REC.sctx = REC.scratch.getContext('2d');

    if(!haveWebCodecs){ return startMediaRecorder(); }

    return pickCodec(REC.w, REC.h).then(function(pick){
      if(!pick){ return startMediaRecorder(); }

      var onData = function(data, position){
        var copy = data.slice();                 // detach from muxer's reused buffer
        REC.bytes += copy.byteLength;
        if(REC.worker){
          REC.worker.postMessage({ type:'write', data:copy.buffer, position:position }, [copy.buffer]);
        } else if(REC.memChunks){
          REC.memChunks.push({ data:copy, position:position });
        } else {
          // Storage isn't ready yet: webm-muxer writes its 39-byte EBML header at
          // construction time, before the OPFS worker has opened. Buffer it and drain
          // once storage is ready, so that header is never dropped. (Dropping it left
          // the file with 39 zero bytes at offset 0 and no EBML magic — "corrupted".)
          (REC.pending || (REC.pending = [])).push({ data:copy, position:position });
        }
      };

      REC.muxer = new WebMMuxer.Muxer({
        target: new WebMMuxer.StreamTarget({ onData: onData }),
        video: { codec: pick.mux, width: REC.w, height: REC.h, frameRate: REC.playFps },
        streaming: true, type: 'webm', firstTimestampBehavior: 'offset'
      });
      REC.encoder = new VideoEncoder({
        output: function(chunk, meta){ try{ REC.muxer.addVideoChunk(chunk, meta); }catch(e){} },
        error:  function(e){ console.warn('OVERHEAD rec encoder:', e); }
      });
      REC.encoder.configure({
        codec: pick.codec, width: REC.w, height: REC.h,
        bitrate: bitrateFor(REC.w, REC.h), framerate: REC.playFps, latencyMode: 'quality'
      });

      // durable storage tier
      var storeReady = Promise.resolve();
      REC.tier = 1;
      if(haveOPFS){
        REC.worker = makeWorker();
        REC.worker.addEventListener('error', function(){});
        storeReady = workerCall(REC.worker, { type:'open', name:OPFS_NAME }, [], 'opened')
          .catch(function(){ try{ REC.worker.terminate(); }catch(e){} REC.worker = null; });
      }
      return storeReady.then(function(){
        if(!REC.worker){ REC.tier = 2; REC.memChunks = []; }
        // flush anything onData buffered before storage was ready (the EBML header)
        if(REC.pending && REC.pending.length){
          var q = REC.pending; REC.pending = null;
          q.forEach(function(c){
            if(REC.worker){ REC.worker.postMessage({ type:'write', data:c.data.buffer, position:c.position }, [c.data.buffer]); }
            else if(REC.memChunks){ REC.memChunks.push(c); }
          });
        }
        try{ localStorage.setItem(LS_MARK, JSON.stringify({
          name: OPFS_NAME, startedISO: new Date().toISOString(),
          w: REC.w, h: REC.h, tier: REC.tier
        })); }catch(e){}
        REC.active = true;
        updateButton(); startTimer();
        toast('RECORDING SKY',
          (REC.tier===1 ? 'Crash-safe · ' : 'In-memory · ') + speedup() + '\u00D7 time-lapse \u00B7 ' + REC.w + '\u00D7' + REC.h,
          'var(--red)');
      });
    });
  }

  // ── tier 3: MediaRecorder (real-time, no decimation) ─────────────
  function startMediaRecorder(){
    try{
      var fps = REC.playFps;
      var stream = cv.captureStream(fps);
      var mime = 'video/webm;codecs=vp9';
      if(!(window.MediaRecorder && MediaRecorder.isTypeSupported(mime))) mime = 'video/webm';
      REC.mediaRec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrateFor(REC.w, REC.h) });
      REC.mediaBlobs = [];
      REC.mediaRec.ondataavailable = function(e){ if(e.data && e.data.size) REC.mediaBlobs.push(e.data); };
      REC.mediaRec.start(1000);
      REC.tier = 3; REC.active = true;
      updateButton(); startTimer();
      toast('RECORDING SKY', 'Real-time capture (basic mode) \u00B7 ' + REC.w + '\u00D7' + REC.h, 'var(--amber)');
    }catch(e){
      toast('CANNOT RECORD', 'This browser blocks canvas capture', 'var(--amber)');
    }
  }

  // ── per-frame capture (called from the draw loop) ────────────────
  function frameHook(now){
    if(!REC.active || REC.tier === 3) return;       // tier 3 pulls frames itself
    if(now - REC.lastCap < REC.capMs) return;
    REC.lastCap = now;
    try{
      REC.sctx.drawImage(cv, 0, 0, REC.w, REC.h);
      var dur = Math.round(1e6 / REC.playFps);
      var ts  = Math.round(REC.frameIndex * 1e6 / REC.playFps);
      var vf  = new VideoFrame(REC.scratch, { timestamp: ts, duration: dur });
      var key = (REC.frameIndex % Math.max(1, REC.playFps * 2)) === 0;  // keyframe ~every 2s of playback
      REC.encoder.encode(vf, { keyFrame: key });
      vf.close();
      REC.frameIndex++;
    }catch(e){ /* drop a frame rather than break the loop */ }
  }

  // ── STOP & SAVE ──────────────────────────────────────────────────
  function stop(){
    if(!REC.active) return Promise.resolve();
    REC.active = false; stopTimer(); updateButton(true);

    if(REC.tier === 3){ return stopMediaRecorder(); }

    return REC.encoder.flush().catch(function(){}).then(function(){
      try{ REC.muxer.finalize(); }catch(e){}
      if(REC.tier === 1 && REC.worker){
        return workerCall(REC.worker, { type:'stop', name:OPFS_NAME }, [], 'stopped')
          .then(function(r){ return new Blob([r.buffer], { type:'video/webm' }); })
          .catch(function(){ return null; });
      }
      // tier 2 — assemble positioned chunks from memory
      var total = 0;
      REC.memChunks.forEach(function(c){ total = Math.max(total, c.position + c.data.byteLength); });
      var out = new Uint8Array(total);
      REC.memChunks.forEach(function(c){ out.set(c.data, c.position); });
      return new Blob([out], { type:'video/webm' });
    }).then(function(blob){
      cleanupEngine();
      var done = Promise.resolve();
      if(REC.worker){
        done = workerCall(REC.worker, { type:'delete', name:OPFS_NAME }, [], 'deleted').catch(function(){});
      }
      return done.then(function(){
        if(REC.worker){ try{ REC.worker.terminate(); }catch(e){} REC.worker = null; }
        REC.memChunks = null;
        try{ localStorage.removeItem(LS_MARK); }catch(e){}
        if(blob && blob.size){
          download(blob, 'OVERHEAD-timelapse-' + stampFrom() + '.webm');
          toast('TIME-LAPSE SAVED', 'In your Downloads \u00B7 ' + fmtBytes(blob.size), 'var(--green)');
        } else {
          toast('NOTHING TO SAVE', 'No frames were captured', 'var(--amber)');
        }
        updateButton();
      });
    });
  }

  function stopMediaRecorder(){
    return new Promise(function(res){
      var mr = REC.mediaRec;
      if(!mr){ res(); return; }
      mr.onstop = function(){
        var blob = new Blob(REC.mediaBlobs, { type:'video/webm' });
        REC.mediaRec = null; REC.mediaBlobs = null;
        try{ localStorage.removeItem(LS_MARK); }catch(e){}
        if(blob.size){
          download(blob, 'OVERHEAD-timelapse-' + stampFrom() + '.webm');
          toast('RECORDING SAVED', 'In your Downloads \u00B7 ' + fmtBytes(blob.size), 'var(--green)');
        }
        updateButton(); res();
      };
      try{ mr.stop(); }catch(e){ updateButton(); res(); }
    });
  }

  function cleanupEngine(){
    try{ if(REC.encoder && REC.encoder.state !== 'closed') REC.encoder.close(); }catch(e){}
    REC.encoder = null; REC.muxer = null; REC.scratch = null; REC.sctx = null;
  }

  // ── crash recovery (on next launch) ──────────────────────────────
  function checkRecovery(){
    var marker = null;
    try{ marker = JSON.parse(localStorage.getItem(LS_MARK) || 'null'); }catch(e){}
    if(!marker) return;
    if(marker.tier !== 1 || !haveOPFS){ try{ localStorage.removeItem(LS_MARK); }catch(e){} return; }
    var w = makeWorker();
    workerCall(w, { type:'probe', name: marker.name || OPFS_NAME }, [], 'probed')
      .then(function(p){
        if(!p || !p.exists){ try{ localStorage.removeItem(LS_MARK); }catch(e){} try{ w.terminate(); }catch(e){} return; }
        REC.recWorker = w;
        var started = '';
        try{ started = new Date(marker.startedISO).toLocaleString(); }catch(e){}
        var msg = document.getElementById('rec-rv-msg');
        if(msg) msg.textContent = 'A time-lapse from ' + (started || 'a previous session') +
          ' was preserved before the tab closed (\u2248' + fmtBytes(p.size) + ').';
        var el = document.getElementById('rec-recover'); if(el) el.classList.add('show');
      })
      .catch(function(){ try{ localStorage.removeItem(LS_MARK); }catch(e){} try{ w.terminate(); }catch(e){} });
  }
  function recoverSave(){
    var w = REC.recWorker; if(!w) return;
    var marker = {}; try{ marker = JSON.parse(localStorage.getItem(LS_MARK) || '{}'); }catch(e){}
    var startedDate = null; try{ startedDate = new Date(marker.startedISO); }catch(e){}
    workerCall(w, { type:'read', name: marker.name || OPFS_NAME }, [], 'readdata')
      .then(function(r){
        var blob = new Blob([r.buffer], { type:'video/webm' });
        download(blob, 'OVERHEAD-timelapse-' + stampFrom(startedDate) + '-recovered.webm');
        toast('RECORDING RECOVERED', 'Saved to Downloads \u00B7 ' + fmtBytes(blob.size), 'var(--green)');
      })
      .catch(function(e){ toast('RECOVERY FAILED', String((e && e.message) || e), 'var(--amber)'); })
      .then(function(){ recoverDiscard(true); });
  }
  function recoverDiscard(silent){
    var w = REC.recWorker;
    var marker = {}; try{ marker = JSON.parse(localStorage.getItem(LS_MARK) || '{}'); }catch(e){}
    var fin = Promise.resolve();
    if(w){ fin = workerCall(w, { type:'delete', name: marker.name || OPFS_NAME }, [], 'deleted').catch(function(){}); }
    fin.then(function(){
      if(w){ try{ w.terminate(); }catch(e){} REC.recWorker = null; }
      try{ localStorage.removeItem(LS_MARK); }catch(e){}
      var el = document.getElementById('rec-recover'); if(el) el.classList.remove('show');
      if(silent !== true) toast('DISCARDED', 'Interrupted recording removed', 'var(--amber)');
    });
  }

  // ── UI: button + live timer ──────────────────────────────────────
  var _timer = null;
  function startTimer(){
    stopTimer();
    _timer = setInterval(function(){
      var sub = document.getElementById('rec-sub'); if(!sub) return;
      var el = Math.floor((performance.now() - REC.startMs) / 1000);
      var clip = REC.tier === 3 ? el : (REC.frameIndex / REC.playFps);
      sub.textContent = '\u25CF ' + fmtClock(el) + ' \u00B7 ' +
        (REC.tier === 3 ? 'live' : REC.frameIndex + 'f') +
        ' \u00B7 ' + fmtBytes(REC.bytes) + ' \u00B7 ' + clip.toFixed(1) + 's clip';
    }, 500);
  }
  function stopTimer(){ if(_timer){ clearInterval(_timer); _timer = null; } }

  function updateButton(busy){
    var b = document.getElementById('b-record'); if(!b) return;
    var icon = b.querySelector('.btn-icon');
    var lt = document.getElementById('rec-lt');
    var sub = document.getElementById('rec-sub');
    if(busy && !REC.active){
      b.classList.add('on'); b.classList.remove('recording');
      if(icon) icon.textContent = '\u29D7';
      if(lt) lt.textContent = 'SAVING\u2026';
      if(sub) sub.textContent = 'Finalising time-lapse';
      return;
    }
    if(REC.active){
      b.classList.add('on','recording');
      if(icon) icon.textContent = '\u25CF';
      if(lt) lt.textContent = 'STOP & SAVE';
    } else {
      b.classList.remove('on','recording');
      if(icon) icon.textContent = '\u23FA';
      if(lt) lt.textContent = 'RECORD SKY';
      if(sub) sub.textContent = 'Time-lapse to Downloads';
    }
  }

  // ── settings popover ─────────────────────────────────────────────
  function refreshReadout(){
    var d = targetDims();
    var sp = speedup();
    var videoSecPerHour = 3600000 / (REC.capMs * REC.playFps);
    var mbPerHour = bitrateFor(d.w, d.h) * videoSecPerHour / 8 / 1e6;
    var oneHourClip = fmtClock(Math.round(videoSecPerHour));
    var ro = document.getElementById('rec-readout');
    if(ro){
      ro.innerHTML =
        'Speed-up: <b>' + sp + '\u00D7</b><br>' +
        '1 hour of sky \u2192 <b>' + oneHourClip + '</b> clip<br>' +
        'Output: <b>' + d.w + '\u00D7' + d.h + '</b> \u00B7 ~<b>' + mbPerHour.toFixed(0) + ' MB</b> per hour';
    }
    var note = document.getElementById('rec-note');
    if(note){
      var bits = [];
      if(!haveWebCodecs) bits.push('WebCodecs unavailable \u2014 basic real-time capture only.');
      else if(!haveOPFS) bits.push('Crash-recovery needs https/localhost \u2014 disabled here.');
      else bits.push('Crash-safe: capture survives an unexpected tab close.');
      bits.push('Keep this tab visible while recording.');
      note.textContent = bits.join(' ');
    }
  }
  function syncSelects(){
    var set = function(id,v){ var el = document.getElementById(id); if(el) el.value = String(v); };
    set('rec-cap', REC.capMs); set('rec-fps', REC.playFps); set('rec-res', REC.resLong);
    set('rec-q', REC.quality); set('rec-codec', REC.codec);
    ['rec-cap','rec-fps','rec-res','rec-q','rec-codec'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.disabled = REC.active;
    });
  }
  function recOpenSettings(){
    loadCfg(); syncSelects(); refreshReadout();
    var el = document.getElementById('rec-panel'); if(el) el.classList.add('show');
  }
  function recCloseSettings(){
    var el = document.getElementById('rec-panel'); if(el) el.classList.remove('show');
  }
  function recApply(){
    if(REC.active) return;
    var g = function(id){ var el = document.getElementById(id); return el ? el.value : null; };
    REC.capMs   = +g('rec-cap')   || REC.capMs;
    REC.playFps = +g('rec-fps')   || REC.playFps;
    REC.resLong = +g('rec-res')   || REC.resLong;
    REC.quality = g('rec-q')      || REC.quality;
    REC.codec   = g('rec-codec')  || REC.codec;
    saveCfg(); refreshReadout();
  }

  // ── public toggle ────────────────────────────────────────────────
  function recToggle(){
    if(REC.busy) return;
    REC.busy = true;
    var p = REC.active ? stop() : start();
    Promise.resolve(p).catch(function(e){
      console.warn('OVERHEAD rec:', e);
      toast('RECORDING ERROR', String((e && e.message) || e), 'var(--amber)');
      REC.active = false; updateButton();
    }).then(function(){ REC.busy = false; });
  }

  // best-effort flush if the page is being hidden mid-recording
  window.addEventListener('pagehide', function(){
    if(REC.active && REC.worker){ try{ REC.worker.postMessage({ type:'write', data:new ArrayBuffer(0), position:0 }); }catch(e){} }
  });

  // ── expose ───────────────────────────────────────────────────────
  REC.frameHook = frameHook;
  REC.checkRecovery = checkRecovery;
  window.REC = REC;
  window.recToggle = recToggle;
  window.recOpenSettings = recOpenSettings;
  window.recCloseSettings = recCloseSettings;
  window.recApply = recApply;
  window.recoverSave = recoverSave;
  window.recoverDiscard = recoverDiscard;

  loadCfg();
})();
