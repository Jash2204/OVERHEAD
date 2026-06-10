# OVERHEAD
### Live Sky Projector

> Point a projector at your ceiling. See every plane, the ISS, stars, planets and meteor showers above your exact location — in real time.

---

## What Is OVERHEAD?

OVERHEAD is a browser-based real-time sky projector. It calculates and renders everything currently above your location — aircraft, the International Space Station, named stars, visible planets, active meteor showers and constellation lines — and displays it as a live dome projection designed to be cast onto a bedroom ceiling via a portable projector.

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
| 🔔 Overhead Alert | Pulse alert when aircraft passes within 25km directly above |
| ⊕ Device Orientation | Dome rotates with phone compass heading |
| ⬛ Projector Mode | Pure black background, all elements scaled for ceiling display |
| ⛶ Open Sky Output | One-click clean window (no chrome) for dragging to a projector |

---

## 🚀 Quick Start Guide

For absolute beginners and non-technical users, please follow our dead-simple, step-by-step **[QUICKSTART.md](./QUICKSTART.md)** guide to get up and running in under 5 minutes.

### Technical Developer Setup
If you prefer running the stack manually via the command line:

1. Ensure **Node.js** is installed on your machine.
2. Open your terminal in this project directory and start the background proxy:
   ```bash
   node proxy.js
