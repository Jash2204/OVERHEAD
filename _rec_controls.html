#!/usr/bin/env python3
"""
OVERHEAD v7.2 -> v7.5 "TIMELAPSE" patch
Surgical, anchor-based edits to index.html. No sky/orbital/fetch code touched.
Adds: Record Sky (WebCodecs time-lapse) + inlined webm-muxer (MIT, Vanilagy)
      + durable OPFS crash-recovery. UI + new module only.
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / "index.html"
P    = ROOT / "patch"

html = SRC.read_text(encoding="utf-8")

def load(name): return (P / name).read_text(encoding="utf-8")

css        = load("_rec.css")
controls   = load("_rec_controls.html")
panels     = load("_rec_panels.html")
recjs      = load("_rec.js")
muxerblock = load("_muxer_header.txt")   # already wrapped in <script>…</script>

def replace_once(text, anchor, new, label):
    n = text.count(anchor)
    if n != 1:
        raise SystemExit(f"[FAIL] anchor for {label!r} found {n} times (need exactly 1)")
    return text.replace(anchor, new, 1)

# 1) Title bump
html = replace_once(
    html,
    "<title>OVERHEAD v7.2 — Live Sky Projector</title>",
    "<title>OVERHEAD v7.5 — Live Sky Projector</title>",
    "title",
)

# 2) CSS before </style>
html = replace_once(html, "\n</style>", "\n" + css + "\n</style>", "css")

# 3) Recording control group inside #controls + panels right after #controls
anchor_controls = (
    '      <span class="btn-label">REFRESH DATA<span class="btn-sub">Force fetch now</span></span>\n'
    '    </button>\n'
    '  </div>\n'
    '</div>\n'
)
new_controls = (
    '      <span class="btn-label">REFRESH DATA<span class="btn-sub">Force fetch now</span></span>\n'
    '    </button>\n'
    '  </div>\n'
    + controls +
    '</div>\n'
    + panels
)
html = replace_once(html, anchor_controls, new_controls, "controls+panels")

# 4) Per-frame capture hook at the end of draw()
anchor_hook = (
    "  requestAnimationFrame(t=>{simulate(t);draw(t);});\n"
    "}\n\n"
    "// ═══════════════════════════════════════════════════════\n"
    "// MOUSE / TOUCH INTERACTION"
)
new_hook = (
    "  if(window.REC&&window.REC.active)window.REC.frameHook(now);\n"
    "  requestAnimationFrame(t=>{simulate(t);draw(t);});\n"
    "}\n\n"
    "// ═══════════════════════════════════════════════════════\n"
    "// MOUSE / TOUCH INTERACTION"
)
html = replace_once(html, anchor_hook, new_hook, "frame-hook")

# 5) Recovery check inside ohBoot()
anchor_boot = (
    "  let seen=false; try{ seen = localStorage.getItem('overhead-tour-done')==='1'; }catch(e){}\n"
    "  if(!seen) setTimeout(ohStartTour, 400);\n"
    "}"
)
new_boot = (
    "  let seen=false; try{ seen = localStorage.getItem('overhead-tour-done')==='1'; }catch(e){}\n"
    "  if(!seen) setTimeout(ohStartTour, 400);\n"
    "  // v7.5 — offer to recover an interrupted time-lapse\n"
    "  if(window.REC && window.REC.checkRecovery) setTimeout(window.REC.checkRecovery, 1200);\n"
    "}"
)
html = replace_once(html, anchor_boot, new_boot, "ohBoot-recovery")

# 6) Inlined muxer + recording module just before </body>
anchor_tail = "</script>\n</body>\n</html>"
new_tail = (
    "</script>\n\n"
    + muxerblock + "\n\n"
    + "<script>\n" + recjs + "\n</script>\n"
    + "</body>\n</html>"
)
html = replace_once(html, anchor_tail, new_tail, "tail-scripts")

SRC.write_text(html, encoding="utf-8")
print("[OK] v7.5 patch applied to index.html")
print(f"[OK] new size: {len(html):,} bytes")
