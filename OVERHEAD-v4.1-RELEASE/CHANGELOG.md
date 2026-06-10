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
