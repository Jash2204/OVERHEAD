#!/usr/bin/env python3
# OVERHEAD v9 "CONCORD" — surgical patch for index.html
# Backend + security + UX-menu pass. No graphical/render changes.
import io, sys

P = "index.html"
src = io.open(P, encoding="utf-8").read()
orig = src

def repl(old, new, n=1, label=""):
    global src
    c = src.count(old)
    assert c == n, f"[{label}] expected {n} match(es), found {c}"
    src = src.replace(old, new)
    print(f"  ok: {label}")

# ─────────────────────────────────────────────────────────────────────────
# 1. TITLE v8 -> v9
# ─────────────────────────────────────────────────────────────────────────
repl("<title>OVERHEAD v8 — Live Sky Projector</title>",
     "<title>OVERHEAD v9 — Live Sky Projector</title>", 1, "title->v9")

# ─────────────────────────────────────────────────────────────────────────
# 2. FONTS: drop Google @import (GDPR IP-leak) -> self-hosted @font-face
# ─────────────────────────────────────────────────────────────────────────
old_font = "@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&display=swap');"
new_font = """/* v9: self-hosted fonts — no calls to Google (GDPR: no visitor IPs leak to a third party) */
@font-face{font-family:'Share Tech Mono';font-style:normal;font-weight:400;font-display:swap;
  src:url('fonts/share-tech-mono-latin-400-normal.woff2') format('woff2'),
      url('fonts/share-tech-mono-latin-400-normal.woff') format('woff')}
@font-face{font-family:'Rajdhani';font-style:normal;font-weight:300;font-display:swap;
  src:url('fonts/rajdhani-latin-300-normal.woff2') format('woff2'),
      url('fonts/rajdhani-latin-300-normal.woff') format('woff')}
@font-face{font-family:'Rajdhani';font-style:normal;font-weight:400;font-display:swap;
  src:url('fonts/rajdhani-latin-400-normal.woff2') format('woff2'),
      url('fonts/rajdhani-latin-400-normal.woff') format('woff')}
@font-face{font-family:'Rajdhani';font-style:normal;font-weight:600;font-display:swap;
  src:url('fonts/rajdhani-latin-600-normal.woff2') format('woff2'),
      url('fonts/rajdhani-latin-600-normal.woff') format('woff')}
@font-face{font-family:'Rajdhani';font-style:normal;font-weight:700;font-display:swap;
  src:url('fonts/rajdhani-latin-700-normal.woff2') format('woff2'),
      url('fonts/rajdhani-latin-700-normal.woff') format('woff')}"""
repl(old_font, new_font, 1, "fonts->self-hosted")

# ─────────────────────────────────────────────────────────────────────────
# 3. CSS for the v9 grouped popover panels (mirror #rec-panel look)
# ─────────────────────────────────────────────────────────────────────────
css_anchor = ".rec-field select:disabled{opacity:0.4;cursor:not-allowed}"
css_add = css_anchor + """
/* ── v9 grouped layer menus ── */
.grp-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
  z-index:60;width:308px;max-width:calc(100vw - 36px);max-height:82vh;overflow-y:auto;
  background:var(--panel);border:1px solid rgba(0,212,255,0.30);border-top:2px solid var(--accent);
  backdrop-filter:blur(14px);padding:14px 14px 12px;display:none;
  font-family:'Share Tech Mono',monospace}
.grp-panel.show{display:block;animation:slideIn 0.2s ease}
.grp-panel .ctrl-sep{height:1px;background:rgba(255,255,255,0.05);margin:0}
.grp-panel .btn{width:100%;min-width:0}
.grp-caret{margin-left:8px;opacity:0.45;font-size:15px;align-self:center;transition:opacity .15s}
.grp-btn:hover .grp-caret{opacity:0.9}"""
repl(css_anchor, css_add, 1, "css->grp-panel")

# ─────────────────────────────────────────────────────────────────────────
# 4. CONTROLS: replace the long flat list with grouped openers + move the
#    real toggle buttons into 5 popover panels (ids/handlers unchanged).
# ─────────────────────────────────────────────────────────────────────────
# Find the controls block boundaries.
ctrl_start = src.index('<div id="controls">')
ctrl_end_marker = "\n\n<!-- v7.5 TIMELAPSE — settings popover -->"
ctrl_end = src.index(ctrl_end_marker)
old_controls = src[ctrl_start:ctrl_end]
assert 'id="b-stars"' in old_controls and 'id="b-recset"' in old_controls, "controls block sanity"

# Pull verbatim button HTML out of the old block so handlers/icons are preserved exactly.
def grab(btn_id):
    a = old_controls.index(f'<button class="btn')
    # locate the specific button by id
    i = old_controls.index(f'id="{btn_id}"')
    bstart = old_controls.rfind('<button ', 0, i)
    bend = old_controls.index('</button>', i) + len('</button>')
    return old_controls[bstart:bend]

ids = ["b-stars","b-cons","b-planets","b-meteors","b-milkyway","b-planes","b-iss",
       "b-routes","b-projmode","b-ambient","b-moon","b-realistic","b-sats","b-bortle",
       "b-depth","b-trails","b-labels","b-orient","b-output","b-proj","b-render",
       "b-refresh","b-record","b-recset","b-zenyth"]
B = {i: grab(i) for i in ids}

SEP = '\n    <div class="ctrl-sep"></div>\n    '
def panel(pid, title, col, btn_ids):
    body = SEP.join(B[b] for b in btn_ids)
    return f"""<div id="grp-{pid}" class="grp-panel" style="border-top-color:{col}">
  <div class="rec-hd" style="color:{col}">{title} <span onclick="grpClose('{pid}')">&#10005;</span></div>
  <div class="grp-list">
    {body}
  </div>
</div>
"""

new_controls = f"""<div id="controls">
  <!-- v8 ZENYTH — set location -->
  <div class="ctrl-group">
    {B['b-zenyth']}
  </div>
  <div class="ctrl-sep" style="background:rgba(0,212,255,0.12)"></div>
  <!-- v9 grouped layer menus -->
  <div class="ctrl-group">
    <button class="btn on grp-btn" id="g-sky" style="--btn-col:#b8c8ff" onclick="grpOpen('sky')">
      <span class="btn-icon">&#9733;</span>
      <span class="btn-label">SKY OBJECTS<span class="btn-sub">Stars &middot; planets &middot; Moon &middot; more</span></span>
      <span class="grp-caret">&#8250;</span>
    </button>
    <div class="ctrl-sep"></div>
    <button class="btn on grp-btn" id="g-traffic" style="--btn-col:var(--amber)" onclick="grpOpen('traffic')">
      <span class="btn-icon">&#9992;</span>
      <span class="btn-label">OVERHEAD TRAFFIC<span class="btn-sub">Aircraft &middot; ISS &middot; satellites</span></span>
      <span class="grp-caret">&#8250;</span>
    </button>
    <div class="ctrl-sep"></div>
    <button class="btn grp-btn" id="g-view" style="--btn-col:#7fd4ff" onclick="grpOpen('view')">
      <span class="btn-icon">&#9638;</span>
      <span class="btn-label">VIEW<span class="btn-sub">Framing &middot; ambient &middot; orient</span></span>
      <span class="grp-caret">&#8250;</span>
    </button>
    <div class="ctrl-sep"></div>
    <button class="btn on grp-btn" id="g-style" style="--btn-col:#e8eef8" onclick="grpOpen('style')">
      <span class="btn-icon">&#10022;</span>
      <span class="btn-label">STYLE<span class="btn-sub">Realism &middot; darkness &middot; labels</span></span>
      <span class="grp-caret">&#8250;</span>
    </button>
    <div class="ctrl-sep"></div>
    <button class="btn grp-btn" id="g-proj" style="--btn-col:var(--amber)" onclick="grpOpen('proj')">
      <span class="btn-icon">&#11035;</span>
      <span class="btn-label">PROJECTOR<span class="btn-sub">Mode &middot; render &middot; refresh</span></span>
      <span class="grp-caret">&#8250;</span>
    </button>
  </div>
  <div class="ctrl-sep" style="background:rgba(0,212,255,0.12)"></div>
  <div class="ctrl-group">
    {B['b-output']}
  </div>
  <div class="ctrl-sep" style="background:rgba(0,212,255,0.12)"></div>
  <div class="ctrl-group">
    {B['b-record']}
    <div class="ctrl-sep"></div>
    {B['b-recset']}
  </div>
</div>

<!-- v9 grouped layer panels -->
""" + panel("sky","SKY OBJECTS","#b8c8ff",["b-stars","b-cons","b-planets","b-moon","b-milkyway","b-meteors"]) \
    + panel("traffic","OVERHEAD TRAFFIC","var(--amber)",["b-planes","b-routes","b-iss","b-sats"]) \
    + panel("view","VIEW","#7fd4ff",["b-projmode","b-ambient","b-orient"]) \
    + panel("style","STYLE","#e8eef8",["b-realistic","b-bortle","b-depth","b-trails","b-labels"]) \
    + panel("proj","PROJECTOR","var(--amber)",["b-proj","b-render","b-refresh"])

src = src[:ctrl_start] + new_controls + src[ctrl_end:]
print("  ok: controls->grouped + 5 panels")

# ─────────────────────────────────────────────────────────────────────────
# 5. JS: grpOpen / grpClose / syncGroupBadges  (insert before toggle())
# ─────────────────────────────────────────────────────────────────────────
toggle_fn = """function toggle(key,btn) {
  SHOW[key]=!SHOW[key];
  btn.classList.toggle('on');
  pushState(); // keep output in sync
}"""
grp_js = """// ── v9 grouped layer menus ───────────────────────────────────────
const GRP_IDS=['sky','traffic','view','style','proj'];
// Members that drive each group button's "active" dot.
const GRP_MEMBERS={sky:['stars','cons','planets','meteors','milkyway','moon'],
                   traffic:['planes','iss','sats'],
                   style:['realistic','trails','labels']};
function grpOpen(id){
  GRP_IDS.forEach(g=>{const p=document.getElementById('grp-'+g);if(p&&g!==id)p.classList.remove('show');});
  const p=document.getElementById('grp-'+id); if(p)p.classList.toggle('show');
  syncGroupBadges();
}
function grpClose(id){ const p=document.getElementById('grp-'+id); if(p)p.classList.remove('show'); }
function syncGroupBadges(){
  for(const g in GRP_MEMBERS){
    const on=GRP_MEMBERS[g].some(k=>SHOW[k]);
    const b=document.getElementById('g-'+g); if(b)b.classList.toggle('on',on);
  }
}
// Close any open group panel with Escape.
window.addEventListener('keydown',e=>{ if(e.key==='Escape')GRP_IDS.forEach(grpClose); });

function toggle(key,btn) {
  SHOW[key]=!SHOW[key];
  btn.classList.toggle('on');
  syncGroupBadges();
  pushState(); // keep output in sync
}"""
repl(toggle_fn, grp_js, 1, "js->grpOpen/Close + toggle hook")

# ─────────────────────────────────────────────────────────────────────────
# 6. GEO GATE: when location denied, don't pretend the default city is theirs;
#    label it unset and open ZENYTH promptly.
# ─────────────────────────────────────────────────────────────────────────
repl("} catch { OH.locDenied=true; setLoad('LOCATION DENIED · SET IT YOURSELF',20); await new Promise(r=>setTimeout(r,800)); }",
     "} catch { OH.locDenied=true; locationName='Location not set'; setLoad('LOCATION DENIED · SET IT YOURSELF',20); await new Promise(r=>setTimeout(r,800)); }",
     1, "geo-gate->label unset")
repl("if(OH.locDenied){ setTimeout(function(){ zenOpen(); ohToast('LOCATION NOT SHARED','No problem — pick a city or type your coordinates so ZENYTH can show the sky above you.','#7fd4ff'); }, 1400); }",
     "if(OH.locDenied){ setTimeout(function(){ zenOpen(); ohToast('LOCATION NOT SET','Pick a city or type your coordinates — the sky shown is only a placeholder until you do.','#7fd4ff'); }, 300); }",
     1, "geo-gate->prompt sooner")

# ─────────────────────────────────────────────────────────────────────────
# 7. WEB WORKER: offload the aircraft feed's network+JSON parse off the main
#    (render) thread, with graceful fallback to the existing inline path.
# ─────────────────────────────────────────────────────────────────────────
old_fetch = """async function fetchPlanes() {
  // adsb.lol / ADSBExchange-compatible dist endpoint caps the radius at 250 NM.
  // BOX_DEG*60 can exceed that (e.g. 9°→540 NM), which returns a 4xx — fatal once
  // /api/proxy is live on Vercel, since every source requests this same URL.
  // Clamp to the API max; the dome still shows the full BOX_DEG field of view,
  // and planes beyond 250 NM sit near the horizon and get culled anyway.
  const nm=Math.min(250, Math.round(CFG.BOX_DEG*60));
  const lat4=userLat.toFixed(4), lon4=userLon.toFixed(4);
  const base=`https://api.adsb.lol/v2/lat/${lat4}/lon/${lon4}/dist/${nm}`;
  const enc=encodeURIComponent(base);
  const SOURCES=[
      // 1. Vercel Cloud Proxy (Primary when live on your domain)
      [`/api/proxy?url=${enc}`, js=>js.ac||js.aircraft||[]],
      // 2. Local proxy (most reliable – run proxy.js alongside the app)
      [`http://localhost:3001/?url=${enc}`, js=>js.ac||js.aircraft||[]],
      // 3. Direct (works if adsb.lol enables CORS)
      [base, js=>js.ac||js.aircraft||[]],
      // 4. allorigins fallback
      [`https://api.allorigins.win/raw?url=${enc}`, js=>js.ac||js.aircraft||[]],
      [`https://api.allorigins.win/get?url=${enc}`, js=>{try{const i=JSON.parse(js.contents);return i.ac||i.aircraft||[];}catch{return[];}}],
    ];
  let aircraft=null;
  for(const [url,extract] of SOURCES){
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(15000)});
      if(!r.ok) continue;
      const js=await r.json();
      const ac=extract(js);
      if(ac&&ac.length>0){aircraft=ac;break;}
    }catch{}
  }
  if(!aircraft){"""

new_fetch = """// ── v9: aircraft feed is fetched + JSON-parsed in a background Worker so the
//    render thread never hitches on a slow download. Falls back to inline
//    fetch when Workers/blob URLs are unavailable (e.g. file://). ──
let planeWorker=null, planeReqId=0;
(function initPlaneWorker(){
  try{
    if(typeof Worker==='undefined'||typeof Blob==='undefined') return;
    const code=`self.onmessage=async function(e){
      var d=e.data, out=null;
      for(var i=0;i<d.sources.length;i++){
        var s=d.sources[i];
        try{
          var r=await fetch(s.url,{signal:AbortSignal.timeout(15000)});
          if(!r.ok) continue;
          var js=await r.json(), ac;
          if(s.kind==='allorigins-get'){ try{var p=JSON.parse(js.contents); ac=p.ac||p.aircraft||[];}catch(_){ac=[];} }
          else { ac=js.ac||js.aircraft||[]; }
          if(ac&&ac.length>0){ out=ac; break; }
        }catch(_){}
      }
      self.postMessage({id:d.id, aircraft:out});
    };`;
    const url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
    planeWorker=new Worker(url);
    planeWorker.onerror=function(){ planeWorker=null; }; // disable -> inline next cycle
  }catch(err){ planeWorker=null; }
})();

function buildPlaneSources(){
  const nm=Math.min(250, Math.round(CFG.BOX_DEG*60));
  const lat4=userLat.toFixed(4), lon4=userLon.toFixed(4);
  const base=`https://api.adsb.lol/v2/lat/${lat4}/lon/${lon4}/dist/${nm}`;
  const enc=encodeURIComponent(base);
  // Worker fetches need absolute URLs; the proxy is same-origin.
  const origin=(location.protocol==='file:')?'':location.origin;
  return [
    {url:`${origin}/api/proxy?url=${enc}`, kind:'direct'},      // 1. Vercel proxy (primary live)
    {url:`http://localhost:3001/?url=${enc}`, kind:'direct'},   // 2. Local proxy
    {url:base, kind:'direct'},                                  // 3. Direct (if adsb.lol CORS)
    {url:`https://api.allorigins.win/raw?url=${enc}`, kind:'direct'},
    {url:`https://api.allorigins.win/get?url=${enc}`, kind:'allorigins-get'},
  ];
}
function fetchPlanesViaWorker(sources){
  return new Promise(resolve=>{
    const id=++planeReqId;
    const to=setTimeout(()=>{ cleanup(); resolve(null); }, 20000);
    function onMsg(e){ if(e.data&&e.data.id===id){ cleanup(); resolve(e.data.aircraft||null); } }
    function cleanup(){ clearTimeout(to); planeWorker.removeEventListener('message',onMsg); }
    planeWorker.addEventListener('message',onMsg);
    try{ planeWorker.postMessage({id, sources}); }catch(err){ cleanup(); resolve(null); }
  });
}
async function fetchPlanesInline(sources){
  for(const s of sources){
    try{
      const r=await fetch(s.url,{signal:AbortSignal.timeout(15000)});
      if(!r.ok) continue;
      const js=await r.json();
      let ac;
      if(s.kind==='allorigins-get'){ try{const i=JSON.parse(js.contents); ac=i.ac||i.aircraft||[];}catch{ac=[];} }
      else { ac=js.ac||js.aircraft||[]; }
      if(ac&&ac.length>0) return ac;
    }catch{}
  }
  return null;
}
async function fetchPlanes() {
  const sources=buildPlaneSources();
  let aircraft = planeWorker ? await fetchPlanesViaWorker(sources) : await fetchPlanesInline(sources);
  // If the worker came back empty once, try inline as a belt-and-braces backup.
  if((!aircraft||!aircraft.length) && planeWorker) aircraft = await fetchPlanesInline(sources);
  if(!aircraft){"""

repl(old_fetch, new_fetch, 1, "js->aircraft worker")

io.open(P,"w",encoding="utf-8").write(src)
print(f"\nWritten {P}: {len(orig)} -> {len(src)} bytes")
