#!/usr/bin/env python3
"""
OVERHEAD v7.5 — render-scale + FPS meter + 4K capture add-on
Surgical edits over the v7.5 build. Lets the control window force an internal
render resolution (Auto / 1080p / 1440p / 4K) with a live FPS readout, and adds
a 4K option to the time-lapse recorder. The projector OUTPUT window always stays
on Auto so it is never burdened by a higher control-window setting.
"""
import pathlib, sys

SRC = pathlib.Path(__file__).resolve().parent.parent / "index.html"
html = SRC.read_text(encoding="utf-8")

def once(text, anchor, new, label):
    if text.count(anchor) != 1:
        raise SystemExit(f"[FAIL] anchor {label!r} found {text.count(anchor)}x (need 1)")
    return text.replace(anchor, new, 1)

# 1) RENDER_MODE + effectiveDPR(), and sizeCanvas() uses it
anchor1 = (
    "let DPR = Math.min(window.devicePixelRatio || 1, 2); // cap at 2× for perf\n"
    "let W = window.innerWidth, H = window.innerHeight;\n"
    "function sizeCanvas(){\n"
    "  DPR = Math.min(window.devicePixelRatio || 1, 2);\n"
    "  W = window.innerWidth; H = window.innerHeight;\n"
)
new1 = (
    "// RENDER SCALE: 'auto' keeps native density (capped 2×). '1080'/'1440'/'2160'\n"
    "// force an internal backing-store height — crisper output and true-4K recording.\n"
    "// The projector OUTPUT window always stays on Auto so it is never over-rendered.\n"
    "let RENDER_MODE = 'auto';\n"
    "try{ const r=localStorage.getItem('overhead-render'); if(r) RENDER_MODE=r; }catch(e){}\n"
    "function effectiveDPR(){\n"
    "  const dpr = window.devicePixelRatio || 1;\n"
    "  if(IS_OUTPUT || RENDER_MODE==='auto') return Math.min(dpr, 2);\n"
    "  const targetH = ({'1080':1080,'1440':1440,'2160':2160})[RENDER_MODE] || 1080;\n"
    "  return Math.max(0.5, Math.min(targetH / (window.innerHeight||targetH), 4));\n"
    "}\n"
    "let DPR = effectiveDPR();\n"
    "let W = window.innerWidth, H = window.innerHeight;\n"
    "function sizeCanvas(){\n"
    "  DPR = effectiveDPR();\n"
    "  W = window.innerWidth; H = window.innerHeight;\n"
)
html = once(html, anchor1, new1, "effectiveDPR")

# 2) render-scale controls + live FPS meter, inserted right after the first sizeCanvas()
anchor2 = "  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);\n}\nsizeCanvas();\n"
new2 = (
    "  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);\n}\nsizeCanvas();\n\n"
    "// ── RENDER SCALE control + live FPS meter (control window only) ──\n"
    "const RENDER_ORDER = ['auto','1080','1440','2160'];\n"
    "const RENDER_LABEL = { auto:'AUTO', '1080':'1080p', '1440':'1440p', '2160':'4K' };\n"
    "function applyRenderMode(){\n"
    "  sizeCanvas();\n"
    "  try{ buildStars(); buildPlanets(); buildMeteorShowers(); buildMilkyWay(); buildMoon(); buildSun(); }catch(e){}\n"
    "}\n"
    "function setRenderMode(mode){\n"
    "  RENDER_MODE = mode;\n"
    "  try{ localStorage.setItem('overhead-render', mode); }catch(e){}\n"
    "  applyRenderMode(); updateRenderBtn();\n"
    "}\n"
    "function cycleRenderScale(){\n"
    "  const i = RENDER_ORDER.indexOf(RENDER_MODE);\n"
    "  setRenderMode(RENDER_ORDER[(i+1) % RENDER_ORDER.length]);\n"
    "}\n"
    "function updateRenderBtn(){\n"
    "  const lt = document.getElementById('render-lt');\n"
    "  const b  = document.getElementById('b-render');\n"
    "  if(lt) lt.textContent = 'RENDER: ' + (RENDER_LABEL[RENDER_MODE] || 'AUTO');\n"
    "  if(b)  b.classList.toggle('on', RENDER_MODE !== 'auto');\n"
    "}\n"
    "let __fpsCount = 0, __fps = 0;\n"
    "setInterval(function(){\n"
    "  __fps = __fpsCount; __fpsCount = 0;\n"
    "  if(IS_OUTPUT) return;\n"
    "  const sub = document.getElementById('render-sub');\n"
    "  if(sub) sub.textContent = cv.width + '×' + cv.height + ' · ' + __fps + ' fps';\n"
    "}, 1000);\n"
)
html = once(html, anchor2, new2, "render-controls")

# 3) tick the FPS counter once per drawn frame (reuse the existing draw hook site)
anchor3 = (
    "  if(window.REC&&window.REC.active)window.REC.frameHook(now);\n"
    "  requestAnimationFrame(t=>{simulate(t);draw(t);});"
)
new3 = (
    "  if(window.REC&&window.REC.active)window.REC.frameHook(now);\n"
    "  __fpsCount++;\n"
    "  requestAnimationFrame(t=>{simulate(t);draw(t);});"
)
html = once(html, anchor3, new3, "fps-tick")

# 4) RENDER SCALE button in the projection group (between Projector Mode and Refresh)
anchor4 = (
    '    <button class="btn" id="b-proj" style="--btn-col:var(--amber)" onclick="toggleProjector()">\n'
    '      <span class="btn-icon">⬛</span>\n'
    '      <span class="btn-label">PROJECTOR MODE<span class="btn-sub">Pure black + large text</span></span>\n'
    '    </button>\n'
    '    <div class="ctrl-sep"></div>\n'
    '    <button class="btn" id="b-refresh" onclick="forceRefresh()">\n'
)
new4 = (
    '    <button class="btn" id="b-proj" style="--btn-col:var(--amber)" onclick="toggleProjector()">\n'
    '      <span class="btn-icon">⬛</span>\n'
    '      <span class="btn-label">PROJECTOR MODE<span class="btn-sub">Pure black + large text</span></span>\n'
    '    </button>\n'
    '    <div class="ctrl-sep"></div>\n'
    '    <button class="btn" id="b-render" style="--btn-col:#7fd4ff" onclick="cycleRenderScale()">\n'
    '      <span class="btn-icon">▣</span>\n'
    '      <span class="btn-label"><span id="render-lt">RENDER: AUTO</span><span class="btn-sub" id="render-sub">native · — fps</span></span>\n'
    '    </button>\n'
    '    <div class="ctrl-sep"></div>\n'
    '    <button class="btn" id="b-refresh" onclick="forceRefresh()">\n'
)
html = once(html, anchor4, new4, "render-button")

# 5) initialise the render button label once the sky has booted (control window)
anchor5 = (
    "  // v7.5 — offer to recover an interrupted time-lapse\n"
    "  if(window.REC && window.REC.checkRecovery) setTimeout(window.REC.checkRecovery, 1200);\n"
    "}"
)
new5 = (
    "  // v7.5 — offer to recover an interrupted time-lapse\n"
    "  if(window.REC && window.REC.checkRecovery) setTimeout(window.REC.checkRecovery, 1200);\n"
    "  if(typeof updateRenderBtn === 'function') updateRenderBtn();\n"
    "}"
)
html = once(html, anchor5, new5, "render-btn-init")

# 6) add a 4K option to the recorder resolution dropdown
anchor6 = '      <option value="1920">1920 (1080p)</option>\n'
new6 = (
    '      <option value="1920">1920 (1080p)</option>\n'
    '      <option value="3840">3840 (4K)</option>\n'
)
html = once(html, anchor6, new6, "rec-4k-option")

SRC.write_text(html, encoding="utf-8")
print("[OK] render-scale + FPS + 4K capture applied")
print(f"[OK] new size: {len(html):,} chars")
