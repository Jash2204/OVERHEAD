# OVERHEAD
### Live Sky Projector

> Point a projector at your ceiling. See every plane, the ISS, stars, planets and meteor showers above your exact location — in real time.

---

## What Is OVERHEAD?

OVERHEAD v7.5 is a browser-based real-time sky projector. As of v5.0 it defaults to a fully realistic rendering: aircraft appear as blinking nav-lights, the ISS as a gliding warm-white point, and the sky responds to real twilight and a configurable light-pollution level. It calculates and renders everything currently above your location — aircraft, the International Space Station, named stars, visible planets, active meteor showers and constellation lines — and displays it as a live dome projection designed to be cast onto a bedroom ceiling via a portable projector.

It requires no account, no subscription, and no specialist hardware beyond a projector and a laptop. The entire application runs in a single HTML file served by a lightweight local Node.js proxy.

---

## Features

| Feature | Detail |
|---|---|
| ✈ Live Aircraft | Real ADS-B positions via adsb.lol, fetched every 90 seconds |
| 💡 Altitude-scaled nav-lights | Plane lights grow/shrink with true slant distance — a low pass overhead reads big, a high one near the horizon small |
| ◎ ISS Tracking | Live position updated every 5 seconds via wheretheiss.at |
| 🛸 ISS Orbital Path | Predicted 90-minute ground track projected onto dome |
| ★ Named Stars | 40 named stars with accurate Alt/Az positions per session |
| ∴ Constellations | Orion, Ursa Major, Summer Triangle, Pegasus |
| ◉ Planets | Mercury, Venus, Mars, Jupiter, Saturn — calculated via VSOP87 |
| ☄ Meteor Showers | 8 annual showers with animated streaks from active radiants |
| 🌌 Milky Way | Galactic plane rendered as a soft glowing band, accurate to Sagittarius |
| ↗ Flight Paths | Great-circle trajectory arcs for any aircraft (click to view) |
| ✨ Scintillation | Altitude-accurate star twinkling — horizon stars shimmer more |
| ◈ Depth 3D | Parallax star layers with per-star depth |
| ☀ Twilight Engine | Live solar altitude tints the sky through real twilight phases |
| ◐ Sky Darkness | Bortle 1–7 light-pollution model (star density, Milky Way, horizon glow) |
| · Satellites | Simulated LEO passes with occasional flares (visual model, not TLE) |
| ☽ Moon | Live position + accurate phase with earthshine |
| 🔔 Overhead Alert | Pulse alert when aircraft passes within 25km directly above |
| ⏱ Up Next | Approximate countdowns: ISS next pass, next/active meteor shower, next constellation rise |
| 🛰 ISS Alert | Toast + browser notification + chime when the ISS is high overhead (requires location) |
| 🧭 First-run Tour | Guided, click-through walkthrough of every feature on first load (skippable, replayable) |
| ⊕ Device Orientation | Dome rotates with phone compass heading |
| ⬛ Projector Mode | Pure black background, all elements scaled for ceiling display |
| ⛶ Open Sky Output | One-click clean window (no chrome) for dragging to a projector |
| ▣ Render Scale | Force the live render to Auto / 1080p / 1440p / 4K, with a live FPS readout |
| ⏺ Record Sky | Capture the clean sky as a small, sped-up time-lapse straight to Downloads — crash-safe |

---

## How It Works

### Dead-Reckoning Flight Simulation
Aircraft positions are fetched from the ADS-B network every 90 seconds. Between fetches, each plane's position is advanced frame-by-frame at 60fps using its last known heading vector and ground speed — a technique called dead-reckoning, the same approach used by commercial flight trackers such as Flightradar24. Planes that fly out of the visible area disappear naturally as their simulated position moves beyond the dome boundary.

Each aircraft's nav-lights are also scaled by its true **slant distance** (`altitude ÷ sin(elevation)`), so a low plane passing directly overhead reads large and bright while a high one near the horizon reads small — the same idea as stars being sized by magnitude, applied to apparent distance.

### Dome Projection
All objects — stars, planes, ISS, planets — are placed using an azimuthal equidistant projection. Altitude maps to radial distance from the centre (zenith at centre, horizon at the outer ring) and azimuth maps to the angle from north. This is the same projection used in real planetarium ceilings, and means the display accurately reflects what you would see lying flat looking up.

### Star & Planet Positions
Star positions are calculated per-session using Greenwich Sidereal Time derived from the current Julian Date. Right Ascension and Declination (RA/Dec) are converted to Altitude and Azimuth (Alt/Az) relative to the user's GPS coordinates. Planet positions use a simplified VSOP87 model accurate to approximately 1 degree. Both update every 60 seconds as Earth rotates.

### ISS Orbital Path
The ISS ground track is propagated 90 minutes forward from the current position using a simplified circular orbit model at 51.6° inclination, accounting for Earth's rotation. The result is a fading dotted arc across the dome showing where the ISS will be.

### Recording the Sky (Time-lapse)
**Record Sky** captures the clean sky canvas — the same un-warped view sent to the projector — as a true time-lapse. Rather than recording in real time, it grabs one frame every few seconds and stamps the frames for smooth 30 fps playback, so an hour of sky compresses to roughly a minute of video at a fraction of the file size. Frames are encoded on the fly with the browser's native **WebCodecs** `VideoEncoder` (VP9 by default, AV1 optional for even smaller files) and muxed into WebM. Resolution runs up to **3840×2160 (4K)**; because the sky is drawn procedurally, selecting 4K (ideally with Render Scale set to 4K) re-renders genuine detail rather than upscaling a lower-resolution capture.

The hard part — *not losing the recording if the tab is closed unexpectedly* — is handled by writing every encoded chunk straight to an **Origin-Private File System (OPFS)** file from a background worker as it's produced. Because the file on disk is always current, an interrupted session leaves a valid, playable clip behind. On the next launch OVERHEAD detects it and offers **Save to Downloads** or **Discard**. When you stop normally, the finished clip downloads automatically.

Capability is detected and degraded gracefully: full crash-safe time-lapse where WebCodecs + OPFS are available (Chromium on https/localhost), an in-memory time-lapse where OPFS isn't, and a basic real-time MediaRecorder capture as a last resort. Notes: keep the OVERHEAD tab visible while recording (a backgrounded tab is throttled by the browser and won't render new frames), and recovered clips play fine but may not report a seek duration since they were never finalised.

### Render Scale & 4K
The whole scene is drawn procedurally, so it can be rendered at any internal resolution rather than upscaled. The **Render Scale** control forces the control window's backing-store resolution to Auto, 1080p, 1440p or 4K, with a live frame-rate readout baked into the button so the cost is always visible. "Auto" keeps the native pixel density (capped at 2×); on a 4K display that already means a genuine 4K render. The projector **output window always stays on Auto**, so raising the control-window scale never burdens the projected image. Paired with the recorder's 4K option, this produces true 4K time-lapses with real detail instead of interpolated pixels.

### CORS Proxy
Browser security policy (CORS) prevents direct calls to third-party APIs like adsb.lol. A minimal Node.js proxy (`proxy.js`) runs locally on port 3001, forwarding ADS-B requests server-side and returning the response with the correct CORS headers. This is a standard pattern for browser-based applications consuming external APIs.

---

## Quick Start

### Requirements
- Node.js installed
- A modern browser (Chrome recommended)
- For ceiling projection: any portable projector (200+ ANSI lumens recommended)

### Running the App

1. Place `index.html` and `proxy.js` in the same folder
2. Open a terminal in that folder
3. Start the proxy:
```bash
node proxy.js
```
4. In a second terminal, serve the app:
```bash
npx serve .
```
5. Open Chrome and navigate to:
```
http://localhost:3000/index.html
```

### One-Click Launch (Windows)
Double-click `START.bat` — opens the proxy, the server, and the browser automatically.

---

## Deployment

OVERHEAD ships ready to deploy to **Vercel** — the repo already contains `vercel.json`
and a serverless proxy at `api/proxy.js`, so there is no build step and no configuration
to write. The static `index.html` is served as-is, and the proxy runs as a serverless
function at `/api/proxy`.

### Deploy to Vercel (recommended)

1. Push this repo to GitHub (see [Pushing a New Version](#pushing-a-new-version) below).
2. Go to [vercel.com](https://vercel.com), **Add New → Project**, and import the repo.
3. Leave every setting at its default — there is **no build command** and **no output
   directory** to set; it's a static site plus one serverless function.
4. Click **Deploy**. Within a minute you'll get a `https://<your-project>.vercel.app` URL.
5. Put that URL in the **Live demo** line at the top of this README.

That's it. No environment variables, no secrets.

**Why it "just works":** the app tries data sources in order — `/api/proxy` first, then a
local `localhost:3001` proxy, then direct, then public fallbacks. On Vercel the first one
resolves to `api/proxy.js`; running locally it falls through to your `proxy.js`. The same
`index.html` therefore runs unmodified in both places.

**Recording works live:** because Vercel serves over **HTTPS** (a secure context), the
WebCodecs encoder and the OPFS crash-recovery store are both available, so *Record Sky*
and its interrupted-session recovery work fully on the deployed site — not just on
`localhost`.

### Other hosts
- **Any static host + serverless platform** (Netlify, Cloudflare Pages, etc.): serve
  `index.html` statically and deploy `api/proxy.js` as a function at the `/api/proxy`
  path. Adjust the platform's function routing if it differs.
- **Any Node host**: run `proxy.js` (port 3001) alongside a static server. The app's
  source list will use the local proxy automatically.
- **`file://` (no server):** the sky still renders, but WebCodecs/OPFS are disabled, so
  recording falls back to a basic in-memory capture and crash-recovery is off.

---

## Pushing a New Version

```bash
# from the repo root
git add -A
git commit -m "OVERHEAD v7.5 — Record Sky time-lapse, render scale, 4K, fixes"
git push origin main
```

If the project is linked to Vercel, the push **auto-deploys** — the new version is live
within a minute. To verify a release before pushing: run it locally (Quick Start), record
a short clip, and confirm it plays; that exercises the full encode → mux → OPFS → download
path on real hardware.

---



## Projecting Onto Your Ceiling

1. Run OVERHEAD via `npx serve .` and the proxy (see Quick Start) so it loads on `localhost`
2. Plug in your projector and set your display to **Extend** (Windows: Win+P → Extend)
3. Click **Open Sky Output** in the sidebar — a clean black sky window appears
4. Drag that window onto the projector display
5. Click anywhere in it to go fullscreen — zero browser UI, just the sky
6. Adjust layers, location, or orientation in the main control window; the projection updates live

On `localhost` over a secure context, OVERHEAD may offer to auto-place the output on the projector for you. From `file://` it falls back to the drag-and-click flow above.

## Controls

| Button | Function |
|---|---|
| ★ Stars | Toggle star field (named + background) |
| ∴ Constellations | Toggle constellation lines |
| ◉ Planets | Toggle visible planets |
| ☄ Meteor Showers | Toggle active shower radiants and streaks |
| ✈ Aircraft | Toggle live plane tracking |
| ◎ ISS | Toggle ISS and orbital path |
| 〜 Motion Trails | Toggle fade trails behind moving objects |
| T Labels | Toggle names on all objects |
| ⊕ Device Orient | Rotate dome with phone compass |
| ⬛ Projector Mode | Pure black background, scaled for ceiling display |
| ⛶ Open Sky Output | Clean chrome-free projection window, click to fullscreen |
| ▣ Render Scale | Cycle internal resolution (Auto / 1080p / 1440p / 4K) with a live FPS readout |
| ⏺ Record Sky | Start/stop a time-lapse recording of the sky to your Downloads folder |
| ⚙ Time-lapse Settings | Speed (frames/sec captured), playback fps, resolution, quality, codec |
| ↺ Refresh Data | Force immediate data fetch |

Click any plane, planet, or the ISS to open a detail panel with live telemetry.

---

## Data Sources

| Source | Data | Refresh Rate |
|---|---|---|
| adsb.lol | Aircraft positions (ADS-B) | Every 90 seconds |
| wheretheiss.at | ISS position | Every 5 seconds |
| Browser Geolocation API | User coordinates | On load |
| Nominatim (OpenStreetMap) | Reverse geocoding | On load |
| Calculated (VSOP87) | Planet positions | Every 60 seconds |
| Calculated (GST) | Star positions | Every 60 seconds |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Browser (Chrome)               │
│                                             │
│  index.html                        │
│  ├── HTML5 Canvas (60fps render loop)       │
│  ├── Dome projection engine                 │
│  ├── Dead-reckoning simulation              │
│  ├── Star/planet position calculator        │
│  ├── Meteor shower engine                   │
│  └── ISS orbital propagator                │
│               │                             │
│               │ fetch (localhost:3001)      │
└───────────────┼─────────────────────────────┘
                │
┌───────────────▼─────────────────────────────┐
│           proxy.js (Node.js)                │
│           localhost:3001                    │
│                                             │
│  Forwards ADS-B requests server-side        │
│  Adds CORS headers to response              │
└───────────────┬─────────────────────────────┘
                │
                ▼
        api.adsb.lol (ADS-B Network)
        wheretheiss.at (ISS API)
```

---

## Technical Stack

- **Frontend:** Vanilla JavaScript, HTML5 Canvas API
- **Rendering:** Custom azimuthal equidistant dome projection at 60fps
- **Astronomy:** Greenwich Sidereal Time, RA/Dec → Alt/Az, simplified VSOP87
- **Flight Data:** ADS-B Network via adsb.lol
- **ISS Data:** wheretheiss.at public API
- **Location:** Browser Geolocation API + Nominatim reverse geocoding
- **Proxy:** Node.js HTTP server (12 lines, zero dependencies)
- **Recording:** WebCodecs (VP9/AV1) + webm-muxer, durable writes via OPFS + Web Worker
- **Fonts:** Google Fonts (Share Tech Mono, Rajdhani)

---

## For Developers — Notable Engineering

OVERHEAD is a single ~5,000-line `index.html` with one inlined dependency and a 25-line
proxy, but several parts are less trivial than they look:

- **Dead-reckoning at 60 fps.** ADS-B updates arrive only every 90 s, but planes move
  smoothly because each one is advanced every frame from its last heading/ground-speed
  vector — the same technique commercial trackers use — then reconciled on the next fetch.

- **Azimuthal-equidistant dome projection.** Everything (stars, planets, ISS, planes,
  Moon) is placed by mapping altitude → radius and azimuth → angle, so the screen reads
  correctly when you lie back and look up. A closed-form inverse (`elevAtScreen`) recovers
  the elevation angle for any pixel, which drives the altitude-scaled nav-lights.

- **Dual-window projection with corner-pin calibration.** "Open Sky Output" launches a
  second, chrome-free instance (`?mode=output`) kept in sync via `postMessage` /
  `BroadcastChannel`. That window applies its own draggable four-corner homography
  (a CSS `matrix3d`) so the image fits an off-axis ceiling — the manual, more robust
  equivalent of a throw-distance/keystone calculator. The control window keeps the
  **clean, un-warped** sky, which is what the recorder captures.

- **Crash-safe time-lapse recording.** Frames are grabbed on a timer, encoded with the
  native WebCodecs `VideoEncoder`, muxed by an inlined `webm-muxer` in *streaming* mode,
  and every chunk is flushed to an **OPFS** file from a Web Worker as it's produced — so
  an interrupted tab leaves a valid, recoverable clip. Capability is tiered: WebCodecs +
  OPFS (crash-safe) → WebCodecs in-memory → MediaRecorder. *(Implementation note: the muxer
  emits its EBML header at construction, before the storage worker opens, so writes that
  arrive pre-storage are buffered and drained once the file is ready — otherwise the header
  is lost and the file won't play.)*

- **Resolution-independent rendering.** A single effective-DPR value drives the canvas
  backing store and all offscreen layers, so the whole scene can be re-rendered at 4K
  natively (not upscaled) while the projector output window stays efficient on Auto.

- **Surgical, patch-based development.** Features are applied as anchor-based Python patch
  scripts (see `patch/`) rather than hand-edits, so every change is small, reviewable, and
  reproducible against a known base file.

---

## Credits & Third-Party Code

OVERHEAD is built to stay a single, offline-capable HTML file, so its one bundled
dependency is inlined directly into `index.html` with full attribution:

- **[webm-muxer](https://github.com/Vanilagy/webm-muxer)** by *Vanilagy* — MIT License.
  Used to mux the WebCodecs-encoded frames into a WebM container for the Record Sky
  time-lapse feature. The library is included verbatim and credited in-file.

All astronomy, dead-reckoning, projection and rendering code is original. Live data
is provided by adsb.lol (ADS-B), wheretheiss.at (ISS), and Nominatim/OpenStreetMap
(reverse geocoding).

---

## Project Structure

```
OVERHEAD/
├── index.html                  # The entire app (render engine, UI, recorder — inlined)
├── proxy.js                    # Local CORS proxy for development (Node.js, port 3001)
├── api/
│   └── proxy.js                # Serverless CORS proxy for Vercel (/api/proxy)
├── vercel.json                 # Vercel deploy config (zero build step)
├── START.bat                   # Windows one-click launcher
├── QUICKSTART.md               # Short setup guide
├── README.md                   # This file
├── CHANGELOG.md                # Version history
├── LICENSE.txt                 # License
├── THIRD-PARTY-LICENSES/
│   └── webm-muxer-LICENSE.txt  # MIT license for the inlined muxer
└── patch/                      # Anchor-based patch scripts used to build features
```

---

## Roadmap

- [ ] Keystone correction for angled projector placement
- [ ] First-run setup wizard
- [x] Milky Way band (v3.1)
- [x] Atmospheric scintillation (v3.1)
- [x] Flight path arcs (v3.1)
- [ ] Cinematic long trails and breathing glow animations
- [ ] Click-to-track: dedicated ring follows selected plane
- [ ] Tap dome to read Alt/Az at any point
- [x] Clean projection output window (v3.2)
- [x] Record the sky as a crash-safe time-lapse (v7.5)
- [ ] Auto-hiding UI (fades after 5s inactivity)
- [ ] START.bat one-click Windows launcher
- [ ] Cloud-hosted proxy for zero-setup sharing
- [ ] Mobile companion app (Device Orientation)

---

## Author

**Jash Patel** — Computer Science, Aston University
Copyright © 2026 Jash Patel. All rights reserved. See LICENSE.txt.  
GitHub: [github.com/Jash2204](https://github.com/Jash2204)

---

*OVERHEAD is an independent personal project. Not affiliated with any aviation authority, space agency, or mapping service.*
