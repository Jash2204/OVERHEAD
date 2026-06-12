# OVERHEAD
### Live Sky Projector

> Point a projector at your ceiling. See every plane, the ISS, stars, planets and meteor showers above your exact location — in real time.

---

## What Is OVERHEAD?

OVERHEAD v5.2 is a browser-based real-time sky projector. As of v5.0 it defaults to a fully realistic rendering: aircraft appear as blinking nav-lights, the ISS as a gliding warm-white point, and the sky responds to real twilight and a configurable light-pollution level. It calculates and renders everything currently above your location — aircraft, the International Space Station, named stars, visible planets, active meteor showers and constellation lines — and displays it as a live dome projection designed to be cast onto a bedroom ceiling via a portable projector.

It requires no account, no subscription, and no specialist hardware beyond a projector and a laptop. The entire application runs in a single HTML file served by a lightweight local Node.js proxy.

---

## Features

| Feature | Detail |
|---|---|
| ✈ Live Aircraft | Real ADS-B positions via adsb.lol, fetched every 90 seconds |
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
| ⊕ Device Orientation | Dome rotates with phone compass heading |
| ⬛ Projector Mode | Pure black background, all elements scaled for ceiling display |
| ⛶ Open Sky Output | One-click clean window (no chrome) for dragging to a projector |

---

## How It Works

### Dead-Reckoning Flight Simulation
Aircraft positions are fetched from the ADS-B network every 90 seconds. Between fetches, each plane's position is advanced frame-by-frame at 60fps using its last known heading vector and ground speed — a technique called dead-reckoning, the same approach used by commercial flight trackers such as Flightradar24. Planes that fly out of the visible area disappear naturally as their simulated position moves beyond the dome boundary.

### Dome Projection
All objects — stars, planes, ISS, planets — are placed using an azimuthal equidistant projection. Altitude maps to radial distance from the centre (zenith at centre, horizon at the outer ring) and azimuth maps to the angle from north. This is the same projection used in real planetarium ceilings, and means the display accurately reflects what you would see lying flat looking up.

### Star & Planet Positions
Star positions are calculated per-session using Greenwich Sidereal Time derived from the current Julian Date. Right Ascension and Declination (RA/Dec) are converted to Altitude and Azimuth (Alt/Az) relative to the user's GPS coordinates. Planet positions use a simplified VSOP87 model accurate to approximately 1 degree. Both update every 60 seconds as Earth rotates.

### ISS Orbital Path
The ISS ground track is propagated 90 minutes forward from the current position using a simplified circular orbit model at 51.6° inclination, accounting for Earth's rotation. The result is a fading dotted arc across the dome showing where the ISS will be.

### CORS Proxy
Browser security policy (CORS) prevents direct calls to third-party APIs like adsb.lol. A minimal Node.js proxy (`proxy.js`) runs locally on port 3001, forwarding ADS-B requests server-side and returning the response with the correct CORS headers. This is a standard pattern for browser-based applications consuming external APIs.

---

## Quick Start

### Requirements
- Node.js installed
- A modern browser (Chrome recommended)
- For ceiling projection: any portable projector (200+ ANSI lumens recommended)

### Running the App

1. Place `ceiling-sky-v3.html` and `proxy.js` in the same folder
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
http://localhost:3000/ceiling-sky-v3.html
```

### One-Click Launch (Windows)
Double-click `START.bat` — opens the proxy, the server, and the browser automatically.

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
│  ceiling-sky-v3.html                        │
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
- **Fonts:** Google Fonts (Share Tech Mono, Rajdhani)

---

## Project Structure

```
OVERHEAD/
├── ceiling-sky-v3.html   # Main application
├── proxy.js              # Local CORS proxy (Node.js)
├── START.bat             # Windows one-click launcher
├── README.md             # This file
└── CHANGELOG.md          # Version history
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
