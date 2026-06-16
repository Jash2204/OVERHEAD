#!/usr/bin/env python3
# OVERHEAD v8 "ZENYTH" — surgical patch. Each replacement asserts a unique match.
import io, sys

P = "index.v8.html"
s = io.open(P, encoding="utf-8").read()

def sub(old, new, label, n=1):
    c = s.count(old)
    assert c == n, f"[{label}] expected {n} match(es), found {c}"
    return s.replace(old, new, n)

# ── 1. Title → v8 ───────────────────────────────────────────────────
s = sub("<title>OVERHEAD v7.5 — Live Sky Projector</title>",
        "<title>OVERHEAD v8 — Live Sky Projector</title>", "title")

# ── 2. Global sky-clock offset ──────────────────────────────────────
s = sub(
"let userLat = 52.4862, userLon = -1.8904, locationName = 'Birmingham, UK';",
"let userLat = 52.4862, userLon = -1.8904, locationName = 'Birmingham, UK';\n"
"let skyTimeOffsetMs = 0; // ZENYTH sky-clock (ms). 0 = live. Teleport presets set this to the\n"
"                         // destination's local solar midnight; own coords & GPS stay live.\n"
"                         // Single seam for a future time-of-day / daylight model.",
"global-offset")

# ── 3. The one celestial time source ────────────────────────────────
s = sub(
"  const now=new Date(), jd=now.getTime()/86400000+2440587.5;",
"  const now=new Date(Date.now()+skyTimeOffsetMs), jd=now.getTime()/86400000+2440587.5;",
"sidereal-hook")

# ── 4. State sync: carry the offset to the output window ─────────────
s = sub(
"  return {\n    userLat, userLon, locationName,\n    SHOW: {...SHOW},",
"  return {\n    userLat, userLon, locationName,\n    skyTimeOffsetMs,\n    SHOW: {...SHOW},",
"collectState")
s = sub(
"  if(typeof s.depth3D==='boolean') depth3D = s.depth3D;\n  // Recompute positions for new location/orientation",
"  if(typeof s.depth3D==='boolean') depth3D = s.depth3D;\n  if(typeof s.skyTimeOffsetMs==='number') skyTimeOffsetMs = s.skyTimeOffsetMs;\n  // Recompute positions for new location/orientation",
"applyState")

# ── 5. CSS: ZENYTH panel + output-only hide ─────────────────────────
ZEN_CSS = """body.output-only #rec-panel,body.output-only #rec-recover,body.output-only #zen-panel{display:none!important}
/* ══ v8 ZENYTH — location ═════════════════════════════════════════ */
#zen-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
  z-index:60;width:312px;max-width:calc(100vw - 36px);background:var(--panel);
  border:1px solid rgba(0,212,255,0.30);border-top:2px solid var(--accent);
  backdrop-filter:blur(14px);padding:18px 20px 16px;display:none;
  font-family:'Share Tech Mono',monospace}
#zen-panel.show{display:block;animation:slideIn 0.2s ease}
#zen-panel .rec-hd{color:var(--accent)}
.zen-in{background:#08131f;border:1px solid rgba(0,212,255,0.28);color:#fff;
  font-family:'Share Tech Mono',monospace;font-size:9px;padding:4px 8px;width:130px;
  outline:none;border-radius:2px;text-align:right;-moz-appearance:textfield}
.zen-in:focus{border-color:var(--accent);box-shadow:0 0 0 1px rgba(0,212,255,0.3)}
.zen-btn{width:100%;margin-top:12px;padding:9px;background:transparent;
  border:1px solid var(--accent);color:var(--accent);
  font-family:'Share Tech Mono',monospace;font-size:9.5px;letter-spacing:0.16em;
  cursor:pointer;transition:all 0.15s;border-radius:2px}
.zen-btn:hover{background:rgba(0,212,255,0.14);color:#fff}
.zen-gps{margin-top:8px;border-color:rgba(255,255,255,0.22);color:rgba(255,255,255,0.6)}
.zen-gps:hover{border-color:var(--green);color:var(--green);background:rgba(0,255,170,0.10)}
#zen-panel .rec-readout{border-color:rgba(0,212,255,0.18);background:rgba(0,212,255,0.06)}
#zen-panel .rec-readout b{color:var(--accent)}"""
s = sub(
"body.output-only #rec-panel,body.output-only #rec-recover{display:none!important}",
ZEN_CSS, "zen-css")

# ── 6. Sidebar control button (first in the list) ───────────────────
s = sub(
'<div id="controls">\n',
'<div id="controls">\n'
'  <!-- v8 ZENYTH — set location -->\n'
'  <div class="ctrl-group">\n'
'    <button class="btn" id="b-zenyth" style="--btn-col:#7fd4ff" onclick="zenOpen()">\n'
'      <span class="btn-icon">\u2299</span>\n'
'      <span class="btn-label">ZENYTH \u00b7 LOCATION<span class="btn-sub">Set the sky overhead \u2014 no GPS</span></span>\n'
'    </button>\n'
'  </div>\n'
'  <div class="ctrl-sep" style="background:rgba(0,212,255,0.12)"></div>\n',
"control-button")

# ── 7. ZENYTH panel markup (before the toast host) ──────────────────
ZEN_PANEL = """<!-- v8 ZENYTH — location panel -->
<div id="zen-panel">
  <div class="rec-hd">ZENYTH \u00b7 LOCATION <span onclick="zenClose()">\u2715</span></div>
  <div class="rec-intro">Set what's above your head \u2014 no GPS required. Pick a city or a
    world-class dark-sky site to teleport the night sky there, or type exact coordinates for
    your own spot (kept live, in real time). Nothing is stored.</div>
  <div class="rec-field">
    <label>MAJOR CITY</label>
    <select id="zen-city" onchange="zenApplyCity()"><option value="">\u2014 choose \u2014</option></select>
  </div>
  <div class="rec-field">
    <label>DARK-SKY SITE</label>
    <select id="zen-dark" onchange="zenApplyDark()"><option value="">\u2014 choose \u2014</option></select>
  </div>
  <div class="rec-field">
    <label>LATITUDE</label>
    <input id="zen-lat" class="zen-in" type="number" step="0.0001" min="-90" max="90" placeholder="\u221290 to 90">
  </div>
  <div class="rec-field">
    <label>LONGITUDE</label>
    <input id="zen-lon" class="zen-in" type="number" step="0.0001" min="-180" max="180" placeholder="\u2212180 to 180">
  </div>
  <button class="zen-btn" onclick="zenApplyManual()">SET COORDINATES \u00b7 LIVE</button>
  <button class="zen-btn zen-gps" onclick="zenUseGPS()">USE MY GPS</button>
  <div class="rec-readout" id="zen-read">\u2014</div>
  <div class="rec-note">Teleporting to a city or dark-sky site shows it at local midnight for a
    true night sky. Your own coordinates stay live. No location data is ever stored.</div>
</div>

<!-- v7.2 — TOAST HOST -->"""
s = sub("<!-- v7.2 — TOAST HOST -->", ZEN_PANEL, "zen-panel")

# ── 8. Feature-tour entry ───────────────────────────────────────────
s = sub(
" {t:'Time & place', sel:'#hud-top', b:'The live time, and the location everything is calculated for. Allow location access and it locks to your exact sky.'},",
" {t:'Time & place', sel:'#hud-top', b:'The live time, and the location everything is calculated for. Allow location access and it locks to your exact sky.'},\n"
" {t:'ZENYTH \u00b7 location', sel:'#b-zenyth', b:\"No GPS, or want to stand somewhere else? Open ZENYTH to teleport the night sky to any major city or world-class dark-sky site, or type your own coordinates. Your own spot stays live; teleports show that place at its local midnight.\"},",
"tour-entry")

# ── 9. Boot: denial → prompt, hemisphere-correct readout ────────────
s = sub(
"  } catch { setLoad('LOCATION DENIED · USING BIRMINGHAM',20); await new Promise(r=>setTimeout(r,800)); }",
"  } catch { OH.locDenied=true; setLoad('LOCATION DENIED · SET IT YOURSELF',20); await new Promise(r=>setTimeout(r,800)); }",
"denial-flag")
s = sub(
"  document.getElementById('loc').textContent=`${locationName.toUpperCase()} · ${userLat.toFixed(3)}°N ${Math.abs(userLon).toFixed(3)}°${userLon>=0?'E':'W'}`;",
"  updateLocReadout();",
"readout-call")
s = sub(
"  setTimeout(ohBoot, 700);",
"  setTimeout(ohBoot, 700);\n"
"  if(OH.locDenied){ setTimeout(function(){ zenOpen(); ohToast('LOCATION NOT SHARED','No problem \u2014 pick a city or type your coordinates so ZENYTH can show the sky above you.','#7fd4ff'); }, 1400); }",
"denial-prompt")

# ── 10. The ZENYTH engine (one canonical setter) ────────────────────
ZEN_JS = r"""
// ════════════════════════════════════════════════════════════════════
// ZENYTH (v8) — set what's overhead, anywhere, with no GPS.
// Every position change (GPS, manual coords, city/dark-sky presets and,
// later, a moving car-ceiling feed) flows through one entry point,
// applyLocation(). Teleport presets shift the single sky-clock
// (skyTimeOffsetMs, read only by getSiderealData) to the destination's
// local solar midnight so the sky is always night; the user's own
// coordinates stay live. The engine itself is untouched.
// ════════════════════════════════════════════════════════════════════
const ZEN_CITIES=[
  ['London, UK',51.5074,-0.1278],['New York, USA',40.7128,-74.0060],
  ['Tokyo, Japan',35.6762,139.6503],['Sydney, Australia',-33.8688,151.2093],
  ['Paris, France',48.8566,2.3522],['Los Angeles, USA',34.0522,-118.2437],
  ['Dubai, UAE',25.2048,55.2708],['Singapore',1.3521,103.8198],
  ['Hong Kong',22.3193,114.1694],['Moscow, Russia',55.7558,37.6173],
  ['Cairo, Egypt',30.0444,31.2357],['Rio de Janeiro, Brazil',-22.9068,-43.1729],
  ['Mumbai, India',19.0760,72.8777],['Cape Town, South Africa',-33.9249,18.4241],
  ['Reykjav\u00edk, Iceland',64.1466,-21.9426],['Toronto, Canada',43.6532,-79.3832],
  ['Beijing, China',39.9042,116.4074],['Mexico City, Mexico',19.4326,-99.1332],
  ['Berlin, Germany',52.5200,13.4050],['Istanbul, T\u00fcrkiye',41.0082,28.9784]
];
const ZEN_DARK=[
  ['Mauna Kea, Hawai\u02bbi',19.8207,-155.4681],
  ['Atacama / Elqui Valley, Chile',-30.0421,-70.6957],
  ['Aoraki Mackenzie, New Zealand',-43.8859,170.5006],
  ['NamibRand Reserve, Namibia',-25.1800,16.0400],
  ['Roque de los Muchachos, La Palma',28.7543,-17.8947],
  ['Wadi Rum, Jordan',29.5326,35.4206],
  ['Salar de Uyuni, Bolivia',-20.1338,-67.4891],
  ['Cherry Springs, Pennsylvania',41.6628,-77.8261],
  ['Exmoor, United Kingdom',51.1387,-3.6432],
  ['Jasper, Canada',52.8734,-117.9543]
];

function zenClamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

// ms from now to the nearest local solar midnight at this longitude.
function zenMidnightOffsetMs(lon){
  const d=new Date();
  const utcH=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
  const localSolar=((utcH+lon/15)%24+24)%24;   // 0..24h
  let dh=-localSolar;                            // shift to 00:00 local solar
  if(dh<-12) dh+=24; if(dh>12) dh-=24;           // pick nearest midnight
  return Math.round(dh*3600000);
}

// Hemisphere-correct HUD location readout (fixes the old hardcoded °N).
function updateLocReadout(){
  const el=document.getElementById('loc'); if(!el) return;
  const ns=userLat>=0?'N':'S', ew=userLon>=0?'E':'W';
  el.textContent=`${locationName.toUpperCase()} · ${Math.abs(userLat).toFixed(3)}°${ns} ${Math.abs(userLon).toFixed(3)}°${ew}`;
}

// Reflect a programmatic Bortle change on its button.
function zenSyncBortleBtn(){
  const names={1:'PRISTINE',3:'SUBURBAN',5:'URBAN',7:'CITY'};
  const b=document.getElementById('b-bortle'); if(!b) return;
  b.querySelector('.btn-label').childNodes[0].textContent='SKY: '+(names[BORTLE]||'CUSTOM');
  b.querySelector('.btn-sub').textContent='Bortle '+BORTLE+' · tap to change';
  b.classList.toggle('on', BORTLE===1);
}

// THE canonical observer-position setter.
function applyLocation(lat,lon,name,opts){
  opts=opts||{};
  userLat=zenClamp(lat,-90,90);
  userLon=zenClamp(lon,-180,180);
  if(name) locationName=name;
  skyTimeOffsetMs = opts.night ? zenMidnightOffsetMs(userLon) : 0;
  if(opts.authentic){
    BORTLE=1; zenSyncBortleBtn();
    if(!SHOW.realistic){ SHOW.realistic=true; const rb=document.getElementById('b-realistic'); if(rb) rb.classList.add('on'); }
  }
  buildStars(); buildPlanets(); buildMeteorShowers(); buildMilkyWay(); buildMoon(); buildSun();
  updateLocReadout();
  if(typeof zenUpdateReadout==='function') zenUpdateReadout();
  if(typeof pushState==='function') pushState();
  if(opts.remote){
    ohToast('REMOTE DARK-SKY SITE','This spot is far from any airfield, so expect little or no live air traffic overhead — the stars more than make up for it.','#7fd4ff');
  }
  if(opts.geocode){
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLat}&lon=${userLon}&format=json`)
      .then(r=>r.json()).then(g=>{
        const a=(g&&g.address)||{};
        const nm=a.city||a.town||a.village||a.county||a.state||a.country;
        if(nm){ locationName=nm; updateLocReadout(); if(typeof zenUpdateReadout==='function') zenUpdateReadout(); if(typeof pushState==='function') pushState(); }
      }).catch(()=>{});
  }
}

function zenApplyCity(){
  const sEl=document.getElementById('zen-city'); if(!sEl||sEl.value==='') return;
  const c=ZEN_CITIES[+sEl.value]; if(!c) return;
  const d=document.getElementById('zen-dark'); if(d) d.value='';
  applyLocation(c[1],c[2],c[0],{night:true});
}
function zenApplyDark(){
  const sEl=document.getElementById('zen-dark'); if(!sEl||sEl.value==='') return;
  const c=ZEN_DARK[+sEl.value]; if(!c) return;
  const cy=document.getElementById('zen-city'); if(cy) cy.value='';
  applyLocation(c[1],c[2],c[0],{night:true,remote:true,authentic:true});
}
function zenApplyManual(){
  const la=parseFloat(document.getElementById('zen-lat').value);
  const lo=parseFloat(document.getElementById('zen-lon').value);
  if(!isFinite(la)||!isFinite(lo)||la<-90||la>90||lo<-180||lo>180){
    ohToast('CHECK COORDINATES','Latitude must be between −90 and 90, longitude between −180 and 180.','#ff4466');
    return;
  }
  const cy=document.getElementById('zen-city'), dk=document.getElementById('zen-dark');
  if(cy) cy.value=''; if(dk) dk.value='';
  applyLocation(la,lo,'Custom location',{night:false,geocode:true});
}
function zenUseGPS(){
  if(!navigator.geolocation){ ohToast('NO GPS','This device can\'t share a location — type coordinates instead.','#ff4466'); return; }
  ohToast('LOCATING…','Asking your device for its position.','#7fd4ff');
  navigator.geolocation.getCurrentPosition(function(p){
    const cy=document.getElementById('zen-city'), dk=document.getElementById('zen-dark');
    if(cy) cy.value=''; if(dk) dk.value='';
    const la=document.getElementById('zen-lat'), lo=document.getElementById('zen-lon');
    if(la) la.value=p.coords.latitude.toFixed(4); if(lo) lo.value=p.coords.longitude.toFixed(4);
    applyLocation(p.coords.latitude,p.coords.longitude,'Your location',{night:false,geocode:true});
  }, function(){ ohToast('LOCATION DENIED','No problem — pick a city or type your coordinates instead.','#ff4466'); }, {timeout:7000,enableHighAccuracy:true});
}

function zenUpdateReadout(){
  const r=document.getElementById('zen-read'); if(!r) return;
  const ns=userLat>=0?'N':'S', ew=userLon>=0?'E':'W';
  const mode = skyTimeOffsetMs===0 ? 'LIVE \u00b7 real time' : 'TELEPORTED \u00b7 local midnight';
  r.innerHTML = `<b>${(locationName||'\u2014').toUpperCase()}</b><br>${Math.abs(userLat).toFixed(4)}°${ns} \u00b7 ${Math.abs(userLon).toFixed(4)}°${ew}<br>${mode}`;
}
function zenOpen(){ const e=document.getElementById('zen-panel'); if(e) e.classList.add('show'); zenUpdateReadout(); }
function zenClose(){ const e=document.getElementById('zen-panel'); if(e) e.classList.remove('show'); }

function zenInit(){
  const cy=document.getElementById('zen-city'), dk=document.getElementById('zen-dark');
  if(cy && cy.options.length<=1){ ZEN_CITIES.forEach((c,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=c[0]; cy.appendChild(o); }); }
  if(dk && dk.options.length<=1){ ZEN_DARK.forEach((c,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=c[0]; dk.appendChild(o); }); }
  const la=document.getElementById('zen-lat'), lo=document.getElementById('zen-lon');
  if(la && !la.value) la.value=userLat.toFixed(4);
  if(lo && !lo.value) lo.value=userLon.toFixed(4);
  zenUpdateReadout();
}
zenInit();

"""
s = sub(
"  requestAnimationFrame(t=>{simulate(t);draw(t);});\n}\ninit();",
"  requestAnimationFrame(t=>{simulate(t);draw(t);});\n}\n" + ZEN_JS + "\ninit();",
"zen-engine")

io.open(P, "w", encoding="utf-8").write(s)
print("PATCH OK — new line count:", s.count("\n")+1)
