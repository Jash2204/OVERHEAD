# OVERHEAD — Changelog

## v7.5 — "TIMELAPSE" (June 2026)

OVERHEAD can now record the sky. A new **Record Sky** control captures the clean,
un-warped sky view as a sped-up time-lapse and saves it straight to your Downloads
folder — designed to be small on disk and, crucially, to survive an unexpected tab
close. Additive only: no sky, orbital, fetch or projection maths were touched.

### Record Sky — true time-lapse
Instead of recording in real time, OVERHEAD grabs one frame every few seconds and
stamps the frames for smooth 30 fps playback, so an hour of sky becomes about a
minute of video at a fraction of the size. Frames are encoded with the browser's
native **WebCodecs** `VideoEncoder` and muxed to WebM.
- **Time-lapse Settings** popover: capture speed (1 frame / 1–10 s), playback fps
  (24/30/60), resolution (854 / 1280 / 1920), quality (smallest → crisp) and codec
  (**VP9** for compatibility, **AV1** for smaller files). A live readout shows the
  resulting speed-up and an estimated file size per hour.
- Captures the **clean sky** from the control window's canvas — the same un-warped
  image sent to the projector, with no UI chrome baked in.
- A live button readout shows elapsed time, frames captured, size and clip length.

### Crash-safe recovery
The hard part — not losing a recording if the page closes mid-capture — is solved by
writing every encoded chunk straight to an **Origin-Private File System (OPFS)** file
from a background **Web Worker** as it is produced, using a streaming WebM muxer so the
on-disk file stays valid even if it is never finalised. If a session is interrupted,
the next launch detects the orphaned clip and offers **Save to Downloads** or
**Discard**. A normal stop downloads the finished clip automatically and clears the
durable copy.

### Graceful degradation
Capability is feature-detected: full crash-safe time-lapse where WebCodecs + OPFS are
available (Chromium on https/localhost), an in-memory time-lapse where OPFS isn't, and
a basic real-time `MediaRecorder` capture as a last resort. Recording lives in the
control window only and never appears in the projector output window.

### Render scale & true 4K
A new **Render Scale** control cycles the control window's internal resolution
between **Auto / 1080p / 1440p / 4K**, with a live **FPS readout** in the button so
the performance cost is visible immediately. Auto keeps the previous native density
(capped at 2×); on a 4K display the live sky is already rendered at 4K under Auto.
The projector **output window always stays on Auto**, so raising the control-window
scale never burdens the projected image. The time-lapse recorder gains a matching
**3840 (4K)** resolution option — pair it with Render Scale 4K for genuinely
re-rendered 4K clips (true detail, not upscaling).

### Aircraft lights that scale with distance
Plane nav-lights now scale by true **slant distance** (`altitude ÷ sin(elevation)`),
gently clamped, so a low aircraft passing overhead reads large and bright while a high
one near the horizon reads small — the same principle as stars sized by magnitude.

### Fixes
- **Recorded clips could be unplayable.** webm-muxer writes its 39-byte EBML header the
  moment it is constructed — before the OPFS storage worker had opened — so that first
  write was dropped, leaving the file with no EBML magic at byte 0 (every player reported
  it "corrupted") even though all the video data was intact. Pre-storage writes are now
  buffered and drained once the file is ready, so the header is never lost. Files recorded
  before this fix can be repaired by splicing the (fixed, content-independent) 39-byte
  header back onto the front.

### Credit
Muxing uses **webm-muxer** (MIT) by *Vanilagy*, inlined verbatim into `index.html` to
keep OVERHEAD a single offline file. Full attribution is in the file header and README.

### Notes & limitations
- Keep the OVERHEAD tab visible while recording — a backgrounded tab is throttled by
  the browser and won't render new frames to capture.
- Recovered clips play correctly but may not report a seek duration, as they were
  never finalised.

## v7.2 — "USHER" (June 2026)

The first time anyone opens OVERHEAD, it now explains itself — and the sky now
tells you what's coming. UI layer only: the fetch chain, the 250 NM clamp and
all sky/orbital math are untouched.

### First-run feature tour
Once the sky finishes loading, a guided walkthrough appears and click-throughs
every control one card at a time, so a first-time visitor ends knowing exactly
*what* each feature does. Every line is written from the viewer's side of the
screen — "real planes show up as blinking lights, spot the blink and look out
your window" — and never describes how anything is computed. It highlights each
real control as you go (the sidebar scrolls to keep it in view).
- **Skip** on every step for repeat visitors; once seen or skipped it won't
  auto-open again (remembered in `localStorage`).
- A **?** button in the Up Next panel replays it any time.
- Esc to close, arrow keys to navigate.

### Up Next — approximate countdowns
A compact top-left panel with three live readouts, refreshed on a ticking
clock and clearly labelled *approximate · for enjoyment, not navigation*:
- **Space Station** — next pass in ~N min (with pass quality), or "visible now"
  with minutes remaining. Propagated client-side from the live position using
  the same simplified orbit as the on-dome ground track — no new backend.
- **Meteors** — the active shower with an approximate "~1 every Ns" rate when its
  radiant is up, otherwise the next shower and days until its peak.
- **Constellation** — the next bright constellation to rise (~time), or the one
  highest overhead now. Pure sidereal propagation of the existing star data.
- **Aircraft are deliberately excluded** — dead-reckoning drift between data
  refreshes makes any plane ETA misleading, so planes stay live-only.

### ISS overhead notifications
When the live ISS climbs high over you, OVERHEAD fires a heads-up: an on-screen
toast, a browser notification (if permitted), and a soft two-note chime.
- **Gated on exact-location access** — fires only when geolocation was granted,
  so it never claims something is above a fallback location. Countdowns still
  display without it, just without the push.
- **ISS-only** by design (the safest, least noisy choice). A bell in the panel
  mutes/unmutes everything and is remembered between visits.

---

## v7.1 — "BEACON" (June 2026)

A field-test fix release: one critical backend bug that would have broken the
live deployment, plus the aircraft nav-lights rebuilt so they read as *lights*
on a real ceiling throw instead of flat blobs.

### Aircraft feed radius clamped to API maximum (critical — deploy blocker)
The plane fetch requested a radius of `BOX_DEG × 60` nautical miles — 540 NM at
the default 9° box. The adsb.lol / ADSBExchange-compatible `dist` endpoint caps
the radius at **250 NM** and returns a 4xx for anything larger. Locally this was
invisible: the primary `/api/proxy` source 404s instantly under `npx serve` (no
serverless runtime) and the app silently fell through to the `localhost:3001`
proxy. But once live on Vercel, `/api/proxy` executes and pipes adsb.lol's 4xx
straight back — and because every fallback source requests the *same* over-cap
URL, all five fail and **no aircraft would ever load in production.** The fetch
radius is now clamped to 250 NM. The dome still renders the full `BOX_DEG` field
of view; planes beyond 250 NM sit near the horizon and were culled anyway.

### Nav-lights rebuilt as point sources, not discs
Real-world ceiling test showed aircraft rendering as four solid colour blobs.
Root cause: each nav-light was a flat-filled `arc()` — a solid disc. From the
ground a real LED or strobe is a white-hot core bleeding into a coloured glow
that fades to nothing, and that falloff is what the eye reads as a *light*.
Each light is now a radial-gradient lamp (hot core → saturated colour →
transparent) drawn with `lighter` blending so emitters add like the real thing.
Wingtip nav-lights were spread from ±4·LS to ±7·LS so red (port) and green
(starboard) separate into two distinct lights instead of merging, the strobe
gets a larger bright bloom, and the beacon sits back on the tail. All blink
timing — 1Hz wingtips, slow red beacon, the real ~1.3s double-flash strobe — is
unchanged; this is a rendering-shape fix only.

### Housekeeping
- Page `<title>` corrected to the current version (was stuck at v5.2).

## v7.0 — "HELIOS" (June 2026)

The sky now knows where the Sun is. Render-only changes — no geolocation,
config, or `/api/proxy` fetch logic was touched.

### Sun-position enabler
`buildSun()` previously kept only the solar altitude and discarded everything
else. It now stores the Sun's full projected screen position and azimuth in a
`sunScreen` global. One small change; it powers the next three features and
keeps every Sun-lit element physically consistent with the others.

### Directional twilight
The twilight glow was a uniform radial centred on the zenith — the whole sky
brightened and darkened evenly. It's now pinned to the Sun's compass azimuth on
the horizon rim: a warm twilight arch over the sunset/sunrise point fading
through blue to deep navy on the opposite sky. Tracks `orientationHeading`.
Especially relevant at this latitude in June, where the sky never fully darkens.
(Still off in the pure-black projector path, same as the backdrop.)

### Moon crescent tracks the Sun
The terminator used a hardcoded horizontal offset. The shadow disc is now offset
away from the Sun along the on-screen moon→Sun axis, so the bright limb always
points at the (often below-horizon) Sun — giving the correct latitude/season
crescent tilt. Using the real Sun position means waxing/waning orientation falls
out for free, so the old hardcoded `sign` term is gone. Offset magnitude (phase
fullness) is unchanged from v5.x.

### Planets lit from the real Sun
The volumetric spheres from v6 were lit from a fixed upper-left vector; they now
light from the actual Sun direction, so a planet near the Moon shows a matching
illuminated side. Falls back to the fixed vector before the Sun is built.

### Ionised meteor trains
Fast meteors (the top ~45% by speed) now leave a glowing emerald-turquoise
(rgba 50,255,180) ionisation wake — atomic-oxygen emission, the real
"persistent train" of bright Perseids/Geminids. It's sampled along the head's
path, then diffuses (widens) and fades exponentially over ~70 frames after the
head burns out, drawn with `lighter` blending. Slower meteors still streak clean.
Note: no major shower is active in mid-June, so right now these appear mainly as
ambient sporadics.

### Deferred (pending live feedback)
Atmospheric refraction (sub-degree visible payoff, plus it would desync the
`elevAtScreen` inverse used for plane culling) and the generative cloud layer
(conflicts with the pure-black ceiling projection) are held for post-launch
passes. "Famous locations" teleport is planned for v8 once live feedback is in.

---

## v6.0 — "VOLUMETRIC" (June 2026)

Graphics overhaul now that the data backend is locked. Render-only changes —
no geolocation, config, or `/api/proxy` fetch logic was touched.

### Planets are spheres, not discs
The flat `fillStyle` disc is gone. Each planet now renders as a radial-gradient
sphere lit from a single consistent celestial source (upper-left): a brightened
specular cap, the body colour through the mid-body, then a graded terminator and
a darkened shadowed limb. Reads as a 3D ball at projection scale instead of a
sticker. New `litRGB`/`dimRGB` helpers derive the shading stops from each
planet's base colour, so Mars stays red and Venus stays warm-cream.

### Saturn's rings rebuilt
The old single stroked ellipse ("rings sketch") is replaced by a tilted
elliptical ring system with a width-graded alpha: faint inner C ring -> bright B
ring -> dark Cassini division -> softer A ring -> fade out. Drawn in two arcs —
the far (back) half before the planet body and the near (front) half after — so
the ring genuinely passes behind *and* in front of the sphere. A soft shadow
wedge is cast onto the far ring by the planet.

### Deep-space backdrop
Ambient/preview sky is now a radial blend from an absolute deep-space void
(#020208) at the zenith out to a soft dark cosmic navy (#050515) near the
horizon. The projector-black branch (`PM`) is intentionally left pure #000 —
on a real ceiling throw, any non-black field projects as a glowing grey
rectangle.

### Cinematic constellation lines + label typography
In realistic/ambient modes constellation lines are now crisp, thin (0.6px),
solid silver (rgba 164,179,198 @ 0.18) instead of cyan dashes — far less
chart-clutter. Chart mode keeps its cyan dashed identity. Star, planet and moon
labels render in soft slate-grey with a dark `shadowBlur` halo so the monospace
type reads cleanly against the starfield without hard edges.

### Background starfield
Star radii widened to a true 0.4-1.5px magnitude spread (was ~0.15-1.15px) for
a stronger sense of depth between faint and bright field stars.

### Packaging fix (local run)
Added a runnable standalone `proxy.js` (listens on :3001, zero dependencies) —
the local-dev twin of the Vercel `api/proxy.js` serverless function, which the
app already targets as fetch source #2. `START.bat` and `QUICKSTART.md` now point
at `index.html` (the repo's actual entry file) instead of the old `OVERHEAD.html`
name, so `node proxy.js` + `npx serve .` works out of the box again.

### Already at-spec from v5.x (deliberately not rebuilt)
The Milky Way (multi-layer blurred radial gradients, screen blending, indigo +
warm-cream dust, Great Rift lanes, grain), the moon (limb-darkened sphere, real
maria, ray craters, soft terminator, earthshine), sine-based cached twinkle,
stellar chromatic variance, and the aircraft/ISS fading trails were already
implemented in v5.0-v5.2 and meet the v6 brief as-is.

---

## v5.2 — "PHOTOREAL" (June 2026)

Driven by the first real ceiling-projection field test.

### Milky Way rebuilt
The band was rendering as a chain of visible gradient circles at projection scale. It's now pre-rendered once per rebuild to an offscreen half-resolution layer: blurred overlapping blobs merge into one continuous cloud, a warm bulge brightens toward the galactic centre, dark Great Rift dust lanes thread the core, and thousands of fine grain stars give it real texture. Blitted per-frame with screen blending — faster than the old per-point gradients AND it finally looks like the Milky Way.

### Moon rebuilt
No more flat disc: limb-darkened sphere shading, seven maria at approximately real positions (Imbrium, Serenitatis, Tranquillitatis, Crisium...), bright ray craters (Tycho, Copernicus), and a soft graded terminator with correct crescent geometry. Earthshine retained on the dark limb.

### Planes findable at ceiling scale
Nav-lights now scale with the projection size (a 2px dot on a laptop is invisible on a 2-metre throw), plus: a faint warm findability halo, a red rotating beacon pulse, the real double-flash anti-collision strobe pattern, and a brighter, thicker contrail. Spot the blink + motion on the ceiling, look out the window, match the plane.

---

## v5.1 — "CALIBRATE" (June 2026)

### Fixed
- **Corner handles unreachable in the Output Window.** Default corners sat exactly at the screen edges, leaving the drag handles half (or fully, with projector overscan) off-screen. Corners now default 6% inset from each edge, and any saved corners from a previous window size are clamped back into the visible viewport on open. Handles enlarged 34→46px with a glow and crosshair. Press **R** during calibration to reset corners.

### New
- **Green setup mesh.** The calibration grid is now a dense acid-green mesh that warps live with the corner-pin — what you see during setup is exactly what projects. START SKY button restyled to match.
- **Boot animation.** Hitting START SKY assembles the sky layer by layer: stars → constellations → planets → moon → meteors/satellites → aircraft → ISS, each fading in 0.55s apart (~4s total).
- **◈ Depth 3D.** Parallax star layers — every background star carries a depth value; near stars drift on a slow Lissajous path while far stars barely move and the Milky Way stays fixed (it's the farthest thing in the sky). Subtle, but the dome stops feeling like a flat image. Toggleable, syncs to the Output Window.

---

## v5.0 — "REALISM" (June 2026)

The release that makes OVERHEAD look like an actual night sky instead of a radar screen.

### Realistic rendering overhaul
- **Aircraft are now nav-lights, not icons.** In Realistic mode (the default), every plane renders as it actually appears at night: a warm fuselage light, red/green wingtip nav lights pulsing at 1Hz, and a sharp white strobe every 1.3s. The plane icon only appears on hover/click. Previously nav-light rendering was Ambient-mode only.
- **Flight path arcs are click-only.** No more amber trajectory arcs cluttering the dome — click a plane to see where it's going. FLIGHT PATHS toggle now defaults off.
- **ISS completely redrawn.** Realistic mode: a steady warm-white point with a subtle 4-point diffraction glint — the brightest "star" in the sky, exactly how the ISS looks from the ground. No pulse rings, no green blob. Chart mode: a proper drawn station with white pressurised modules, silver truss and amber-gold solar arrays. Orbital path now shows on hover/select only in Realistic mode.
- **Meteor radiant markers hidden in Realistic mode** — streaks still fire, but the pulsing yellow circles are gone.
- **Moon on by default**, slightly larger in Realistic mode, with earthshine — the dark limb is never fully black, just like the real crescent moon.

### New features
- **☀ Twilight Engine.** OVERHEAD now computes live solar altitude (truncated Meeus). The sky tints through astronomical → nautical → civil twilight blues and stars/Milky Way dim accordingly. Planets stay visible in twilight — as in real life.
- **◐ Sky Darkness (Bortle scale).** New button cycles Bortle 1 (Pristine) → 3 (Suburban) → 5 (Urban) → 7 (City). Controls star count (up to 1.6× at Bortle 1), faint-star brightness, Milky Way intensity, and adds a warm sodium light-pollution glow at the horizon for urban levels. Syncs to the Output Window.
- **· Satellites.** Simulated LEO passes — a faint point glides across the dome every 2–4 minutes over 45–85s; ~30% of passes flare mid-pass like an Iridium flare. Clearly labelled as simulated (not live TLE data).
- **Star spectral colours.** Background stars are no longer uniformly white: ~70% white, 15% blue-white, 10% warm yellow, 5% orange — matching real stellar population distribution.

### Defaults changed
- FLIGHT PATHS: off · MOON: on · SATELLITES: on (new) · REALISTIC SKY: on (unchanged)

---

# CHANGELOG

All notable changes to OVERHEAD are documented here.  
Format: [Version] — Date — Summary

---

## [v4.1.0] — June 2026 — Wide-Field Projection

### Added
- **Two projection modes, user-toggleable** (new VIEW button in sidebar):
  - **WIDE (default)** — a true rectilinear wide-field projection that fills the entire projector rectangle edge to edge. No circle, no wasted black space. Zenith at centre, sky stretching to all four corners — the realistic "looking up" view for a normal-height ceiling. ~150° field of view.
  - **DOME** — the original azimuthal-equidistant hemisphere (full sky in a circle, horizon on the rim). Best for high ceilings or anyone who wants the whole horizon-to-horizon sky in one view.
- The choice is one tap and syncs live to the projection output window.

### Technical
- `altAzToScreen` now branches on projection mode; wide mode perspective-projects each object's zenith angle through a focal length derived from the field of view. All objects (stars, planets, planes, ISS, Moon, Milky Way) inherit the active projection automatically through this single chokepoint.
- `elevAtScreen` gained the matching wide-field inverse so horizon-culling stays exact in both modes.
- Background star field fills the rectangle in wide mode (with 8% bleed for corner-pin warp) and the disk in dome mode.
- Off-frame guards added to every draw loop so below-horizon objects (which project to large coordinates in perspective) are skipped cleanly with no performance cost.
- Wide projection verified against known angles: zenith→centre, 60°→above centre, 15°→near edge, all correct.

### Philosophy
Maximum freedom, plug-and-play simple: wide fills the screen for the common case, dome is one tap away for high ceilings.

---

## [v4.0.0] — June 2026 — Ambient Mode & Ceiling Calibration

### Added
- **AMBIENT MODE** — photoreal full-bleed sky. Dome scales to circumscribe the screen (zenith-crop, like lying back and looking up). 3,200 stars with realistic magnitude distribution; faint 90% pre-rendered to an offscreen layer for 60fps, brightest 300 twinkle live. Enhanced Milky Way with dust lanes and star sprinkle along the band. No rings, labels, or chart furniture — pure sky.
- **Aircraft as real night lights** — in ambient mode planes render as a warm fuselage light with blinking red/green wingtip nav lights and a periodic white strobe, exactly as aircraft appear at night. No icons, no text.
- **MOON** (toggle) — live position via truncated Meeus (≈1° accuracy) with real illumination phase rendered as a shaded disc, plus halo.
- **Sporadic meteors** — occasional random shooting stars in ambient mode, independent of shower radiants.
- **Ceiling calibration (imported from THROW)** — the output window now opens with a grid + four draggable corner handles using THROW's verified homography → CSS matrix3d corner-pin. Fit the sky to any ceiling region, hit START SKY, done. Layout saved to localStorage; press C to re-adjust any time.
- **Background loading** — live data fetches run while the user calibrates; nobody waits on a spinner.
- **Network status messages** — plane-feed failures now retry 5× with 8s backoff and report progress ("retry 2/5 in 8s") instead of failing silently. 15s fetch timeout for slow connections.
- **Clean output** — time/date and corner widgets removed from the projection window entirely.

---

## [v3.3.0] — June 2026 — Realistic Sky Release

### Added
- **Realistic Sky mode** (on by default, toggleable) — the projection now reads as a genuine clear night sky rather than a radar display:
  - **Horizon cull** — aircraft below 8° elevation are hidden, with a smooth 6° fade band above the cutoff. Eliminates the dense ring of planes hugging the dome edge. Implemented via exact inverse dome projection (`elevAtScreen`), so it costs no extra trigonometry per plane and works with dead-reckoned positions.
  - **Vapor contrails** — long amber radar trails replaced with short, thin, white-grey condensation trails that fade quickly, matching how contrails actually look from the ground.
  - **Natural aircraft appearance** — planes render as soft warm-white points of light (like real aircraft at night) instead of amber icons; callsign labels appear only on hover/select.
- **Corner information widgets** — the unused black space around the dome circle now shows live data in projector/output mode: time and date (top-left), aircraft in view vs in range (top-right), ISS status with compass direction and elevation to look (bottom-left), active meteor shower with ZHR (bottom-right). Drawn on canvas so they appear in the projection output window.
- **Native-resolution rendering** — canvas backing store now scales by devicePixelRatio (capped 2×), feeding the projector the sharpest pixels the display supports instead of upscaled ones.

### Verified
- Inverse projection maths unit-tested: zenith=90°, rim=0°, half-radius=45° exact.
- All v3.2 and earlier features confirmed intact (10/10 regression checks).

---

## [v3.2.0] — June 2026 — Projection Output Mode

### Added
- **Open Sky Output** — one-click clean projection window. A new button opens a separate, chrome-free window showing ONLY the sky: pure black, no HUD, no controls, no cursor, edge to edge. Designed to be dragged onto a ceiling projector.
- **Click-to-fullscreen** — clicking anywhere in the output window toggles fullscreen; Esc exits. The render re-fits automatically on resize and fullscreen change.
- **Live state sync** — location, layer toggles, and compass orientation set in the control window update the output window in real time. The output runs its own independent render loop so planes keep moving and time keeps advancing natively (never a frozen frame).
- **Robust multi-channel sync** — primary sync via direct window reference + postMessage (works on both file:// and http/localhost); BroadcastChannel as a backup on hosted origins. Handshake on load ensures the output receives current state immediately.
- **Auto-place enhancement** — on secure contexts (https/localhost), uses the Window Management API to detect an extended display and offer to open the output fullscreen directly on the projector. Falls back gracefully with an on-screen hint on file://.
- **Automatic cleanup** — the output window closes when the control window closes or reloads. All cross-window calls guarded against a closed window.

### Design
- The output window loads the same HTML file with `?mode=output` — the renderer is reused, never forked, so output and control are always pixel-identical.
- Output mode boots minimally: no loader, no UI, straight to sky.

### Unchanged
- No changes to sky/aircraft rendering logic or data sources — this is a pure display layer added on top.

---

## [v3.1.0] — June 2026 — Visual Impact Release

### Added
- **Milky Way band** — the galactic plane rendered as a soft glowing arc across the dome, brightest toward the galactic centre in Sagittarius. Positions computed by sampling galactic longitude at b=0 and converting galactic → equatorial → Alt/Az coordinates. Drawn with additive blending behind all other objects. Verified astronomically accurate: galactic centre lands at RA 17.76h, Dec −28.9°.
- **Atmospheric scintillation** — stars now twinkle realistically based on altitude. Stars near the horizon twinkle deeper and faster (more atmosphere to pass through); stars near the zenith are steadier. Applies to both named and background stars. This is physically accurate behaviour real stargazers will recognise.
- **Flight path arcs** — clicking or hovering an aircraft draws its trajectory as a great-circle arc across the dome: a bright fading line ahead showing where it's heading, a dimmer dotted line behind showing where it came from. In projector mode all flight paths show automatically. Route origin/destination shown in the info panel when the data source provides it.
- New sidebar toggles: Milky Way (🌌), Flight Paths (↗)
- Milky Way added to the legend

### Technical
- `galacticToEquatorial(l, b)` — converts galactic coordinates to RA/Dec using J2000 galactic pole constants
- `buildMilkyWay()` — samples 180 points along the galactic plane, rebuilt every 60s as the sky rotates
- `projectGreatCircle(lat, lon, bearing, distKm, steps, altM)` — projects a great-circle path along a bearing, returns screen points above the horizon
- Scintillation parameters (twinkle depth + speed) scale with elevation angle, computed once per star at build time
- All new maths unit-tested in Node against known real-world values

---

## [v3.0.0] — June 2026 — Full Feature Release

### Added
- **Planets** — Mercury, Venus, Mars, Jupiter, Saturn calculated via simplified VSOP87 model. Saturn rendered with ring sketch. Click for RA/Dec and altitude data.
- **Meteor Showers** — 8 annual showers catalogued (Quadrantids, Lyrids, Eta Aquariids, Perseids, Orionids, Leonids, Geminids, Ursids). Active showers display animated streaks from real radiant points, scaled by ZHR and proximity to peak date.
- **ISS Orbital Path** — 90-minute predicted ground track projected onto dome as fading dotted arc. Propagated using simplified circular orbit at 51.6° inclination with Earth rotation accounted for.
- **Overhead Alert** — Pulsing centre-screen callout when any aircraft passes within 25km directly above the user. Auto-dismisses after 8 seconds.
- **Device Orientation** — Dome rotates in real time with phone/tablet compass heading via DeviceOrientation API. iOS permission request handled.
- **Projector Mode** — Dedicated button switches to pure black background with all UI elements scaled ~1.7× for ceiling legibility from across a room.
- **Labelled Sidebar** — All toggle buttons now display icon + text label + subtitle. Grouped into logical sections (sky objects / live tracking / display / system). Accessible to first-time users with no explanation needed.
- **Planets counter** in HUD stats row.
- **Loading progress bar** with per-step status messages.

### Changed
- Sidebar redesigned from icon-only to icon + label + subtitle format
- Projector mode now scales all HUD text, stats, and sidebar proportionally
- ISS fades gracefully when below horizon rather than hard-cutting

### Technical
- Shared `altAzToScreen()` projection function — all objects (stars, planes, ISS, planets) use identical dome maths
- `geoToScreen()` now takes altitude in metres and computes real bearing + elevation angle via haversine
- Background stars generated inside dome circle using uniform disk sampling (sqrt distribution for even density)
- Meteor streak pool managed per-frame with decay and culling

---

## [v2.1.0] — June 2026 — Proxy & CORS Fix

### Added
- Local Node.js CORS proxy (`proxy.js`) on port 3001 — forwards ADS-B requests server-side, permanently resolving browser CORS restrictions
- Multi-source fallback chain: local proxy → adsb.lol direct → allorigins.win/raw → allorigins.win/get

### Fixed
- **Planes not loading** — root cause: corsproxy.io restricts non-development origins; allorigins.win rejects file:// origin. Resolved by local proxy which has no origin restrictions.
- Zoom lock added — scroll wheel, pinch, and keyboard zoom all disabled to prevent laggy projector behaviour

### Changed
- Switched from OpenSky Network to adsb.lol as primary ADS-B source (better CORS posture, UK coverage, richer field set including aircraft type)
- Aircraft info panel now shows registration, aircraft type code, altitude in feet, speed in knots

---

## [v2.0.0] — June 2026 — Dome Projection Rewrite

### Changed
- **Complete projection overhaul** — replaced flat geographic map with azimuthal equidistant dome projection. Zenith at centre, horizon at outer ring with N/NE/E/SE/S/SW/W/NW labels.
- All objects now share a single coordinate system. Previously stars used Alt/Az dome projection while planes/ISS used a flat geographic offset — inconsistent and inaccurate.
- `geoToScreen()` now computes real bearing and elevation angle from user position using haversine distance and trigonometry
- Background stars constrained inside dome circle using uniform disk sampling
- Altitude rings at 30° and 60° for readable elevation reference
- Earth band gradient outside horizon ring

### Added
- Zenith marker at dome centre
- ISS below-horizon fade (ghosts to transparent as ISS dips below 0° elevation)

---

## [v1.1.0] — June 2026 — Dead-Reckoning Animation

### Added
- **60fps plane animation** via dead-reckoning. Each plane stores a pixel velocity vector (vx, vy) derived from heading and ground speed. Position advances every frame using `sx += vx * dt`.
- On re-fetch, velocity is re-derived from the position delta between old and new coordinates, self-correcting any drift.
- Plane fade-in on first appearance (2-second opacity ramp)
- Motion trails — configurable length trail fading behind each plane and the ISS

### Fixed
- Planes previously jumped to new positions on each 60s fetch with no animation between updates

### Changed
- Fetch interval increased from 60s to 90s (safer rate for free OpenSky tier)
- Plane icon upgraded from triangle to detailed aircraft silhouette shape

---

## [v1.0.0] — June 2026 — Initial Release

### Features
- Real-time star field: 40 named stars with accurate Alt/Az positions calculated from user GPS using Greenwich Sidereal Time and RA/Dec → Alt/Az conversion. 750 background stars with twinkling.
- Constellation lines: Orion, Ursa Major (Big Dipper), Summer Triangle, Pegasus
- ISS live tracking via wheretheiss.at (5-second refresh, position interpolation)
- Aircraft positions from OpenSky Network (60-second fetch, bounding box around user)
- Toggle controls for all layers
- Clock, date, and object count HUD
- Location detection via Browser Geolocation API with Nominatim reverse geocoding
- Colour-accurate named stars (Betelgeuse orange-red, Sirius blue-white, Arcturus amber etc.)
- Click any object for detail panel (altitude, speed, heading, coordinates)

---
