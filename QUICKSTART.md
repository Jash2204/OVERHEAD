# OVERHEAD — Quick Start (5 minutes)

Thanks for downloading OVERHEAD! Here's how to get the sky on your ceiling.

## You need
- A Windows or Mac computer with Chrome
- Node.js installed (free: nodejs.org — click the green button, install, done)
- A projector connected via HDMI (any model works; point it at the ceiling)

## Setup (one time)
1. Unzip this folder anywhere (e.g. Desktop)
2. **Windows:** double-click `START.bat` — two windows open, then Chrome loads the app
   **Mac/Linux:** open Terminal in this folder and run `node proxy.js`, then in a second Terminal `python3 -m http.server 3000`, then open `http://localhost:3000/index.html` in Chrome
3. Allow location access when Chrome asks (this is how it knows YOUR sky)

## Projecting
1. Press **Win+P** → choose **Extend** (Mac: System Settings → Displays → Extend)
2. In the app sidebar click **OPEN SKY OUTPUT** — a clean black sky window appears
3. Drag that window onto the projector screen
4. Click it once → fullscreen. Lights off. Look up.

## Tips
- **REALISTIC SKY** (on by default) hides horizon clutter and shows vapor trails
- Click any plane for its callsign, altitude and route
- The green pulsing dot is the live ISS — the corner text tells you which way to look
- **RECORD SKY** saves a sped-up time-lapse to your Downloads (an hour of sky ≈ a minute of video). It keeps the clip safe as it records, so an accidental tab-close can be recovered next launch. **TIME-LAPSE SETTINGS** tunes speed, resolution (up to 4K), and quality.
- **RENDER SCALE** sets the drawing resolution (Auto / 1080p / 1440p / 4K) and shows a live FPS counter — handy before a 4K recording.
- Everything except planes/ISS works offline — stars and planets are calculated on your machine

## Want it online instead?
You can host OVERHEAD for free on Vercel (no install for visitors) — see **Cost, deployment & licensing** in `README.md`. Recording and crash-recovery work on the live HTTPS site too.

Problems? See `README.md` for the architecture and design notes.
