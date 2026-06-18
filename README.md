# OVERHEAD — Live Sky Projector

> Point any projector at your ceiling and see what's actually above you, right now: live aircraft, the ISS, stars, planets, the Moon, the Milky Way and active meteor showers — computed for your exact location, in real time.

**Live:** https://overhead.world &nbsp;·&nbsp; **No install, no account, no special hardware** — it runs entirely in a browser.

---

## What it is

OVERHEAD is a browser-based, real-time planetarium that projects the *live* sky — including live air traffic — onto a flat ceiling. It calculates everything currently overhead (ADS-B aircraft, the International Space Station, named stars, visible planets, meteor radiants, constellation lines, the galactic plane) and draws it as a dome you cast onto a bedroom ceiling with a cheap portable projector. The whole app is a single self-contained `index.html`; live data is fetched through a small hardened proxy.

## What makes it unique

- **Zero hardware, zero cost.** Comparable ceiling trackers (e.g. *Skylight*) need a Raspberry Pi + an RTL-SDR radio (~$400–1,500) to receive ADS-B. OVERHEAD needs only a browser and any projector — it pulls live aircraft from an open data API instead of radio.
- **Live traffic *and* accurate astronomy in one view** — most projects do one or the other.
- **Plug-and-play, yet deeply tunable.** It just works the second you open the site — share location (or don't) and look up. But almost everything is a control: every sky layer toggles independently, plus light-pollution (Bortle) level, field of view, render resolution, time-lapse speed/quality up to 4K, four-corner projector calibration, and a teleport-anywhere location/sky-clock engine (**ZENYTH**). Zero-config for a casual glance; a deep control surface when you want one.
- **Privacy-first and stateless** — no account, no database, nothing about you stored anywhere.
- **One file.** No build step, no framework, no install — it runs from a static host or even `file://`.

## Quick start

1. Open **overhead.world**.
2. **ZENYTH → Location**: share GPS, or just type a city / coordinates (no GPS needed).
3. Click **Open Sky Output** — a clean, menu-free canvas opens in a second window.
4. Drag that window to your projector display, go fullscreen, and **drag the four corners** to match your ceiling.
5. Hit **Start** on the control window. Done.

## Features (selected)

| | |
|---|---|
| ✈ **Live aircraft** | Real ADS-B positions (adsb.lol), polled in the background, scaled by true slant distance |
| ◎ **ISS** | Live position + predicted 90-minute orbital ground track |
| ★ **Stars / constellations** | Named stars at accurate Alt/Az; constellation lines; altitude-accurate scintillation |
| ◉ **Planets / Moon** | VSOP87-computed planets; live Moon phase with earthshine |
| ☄ **Meteor showers** | 8 annual showers, animated streaks from the correct radiant |
| 🌌 **Milky Way** | Galactic plane as a soft band, oriented correctly to Sagittarius |
| ☀ **Twilight engine** | Live solar altitude tints the sky through real twilight phases |
| ◐ **Light pollution** | Bortle 1–7 model affecting star density, Milky Way and horizon glow |
| ◈ **Depth / parallax** | Per-star depth layers for a subtle 3D feel |
| ⦿ **Projector tools** | Corner-pin calibration, clean output window, in-browser time-lapse capture |

## Architecture at a glance

Single `index.html` (HTML/CSS/JS) → **Canvas2D** rendering → **client-side astronomy** (VSOP87 + sidereal time) → live data (aircraft, ISS, geocoding) via a **hardened serverless proxy** on Vercel → a **two-window** design (controls in one, clean projection in the other) synced locally → deployed as **static files on Vercel's edge**, auto-published from GitHub.

---

## Design decisions & rationale

*Why each choice was made — not just what it does.*

### Privacy & data

- **I store no user data on a server, and the bare minimum in the browser.** Under UK/EU GDPR the safest data is data you never hold: if I don't collect or persist anything personal, there's nothing to breach, no data-protection-fee exposure, and no liability. Your location is computed in your browser and never sent to or saved by me.
- **Location is approximate and optional.** I never require precise GPS — ZENYTH lets you type a city or coordinates instead. That's data minimisation by design, and it means the app still works for anyone who declines location.
- **I self-host the fonts.** Loading fonts from Google's CDN silently leaks every visitor's IP to Google, which is a GDPR problem; bundling the fonts locally means the site makes *zero* third-party requests for them.
- **Analytics are cookieless.** I wanted basic traffic insight without tracking anyone, so I use a cookieless analytics that identifies visitors by a hash reset every 24 hours — no cross-site or cross-day tracking — and I disclose exactly that in the privacy policy.

### Rendering & performance

- **Canvas2D, deliberately — not WebGL/Three.js.** Keeping the whole app one dependency-free file that runs from any static host (or `file://`) with no build step was worth more to me than raw GPU throughput, and a projector's low throw resolution means the GPU was never my bottleneck. The cost is more work on the main thread, which I mitigate below.
- **Expensive static layers are pre-rendered once.** Redrawing the full star field and Milky Way every frame is wasteful, so I render them to offscreen canvases once and composite, keeping the per-frame loop cheap.
- **Live aircraft are fetched and parsed in a Web Worker.** Polling ADS-B and parsing the JSON on the main thread caused visible stutter; moving it to a worker keeps the render loop smooth, with an inline fallback for environments where workers aren't available.
- **The entire engine reads time through one function.** Every celestial body derives its position from a single `getSiderealData()` containing the only `new Date()` call — so adding features like location/time spoofing became a *one-line* global offset instead of touching dozens of call sites.

### Projection (physical-world constraints)

- **The projector output path is locked to pure `#000000`.** Any non-black background throws a visibly glowing rectangle on the ceiling, so the projection path never applies a non-black fill — a hardware reality dictating a hard code rule.
- **Two windows: controls and a clean output.** The projected image has to be free of menus and cursor movement, so I split control and output into separate windows and sync state locally via `postMessage` (with a `BroadcastChannel` backup) — sub-millisecond, no server round-trip.
- **Calibration uses a real homography.** Ceilings are rarely square to the projector, so four draggable corners feed a verified 3×3 homography (corner-pin) transform, keeping straight horizons and round planets un-skewed on a slanted surface.

### Data & accuracy

- **Astronomy is computed client-side (VSOP87 + sidereal time).** Calculating planet, Sun and twilight positions in the browser keeps the app private and serverless and avoids paying for an ephemeris API.
- **Live data comes from open APIs (adsb.lol for aircraft, Nominatim for geocoding — both ODbL).** Free, open data with no hardware is the core differentiator from radio-based trackers; the attribution obligations are met in `NOTICE.md`.
- **The proxy is hardened, not a passthrough.** *Every* live request — aircraft, ISS and geocoding — flows through it, and it's locked to an allowlist of just those three data hosts (so it can't be abused as an open relay). It's edge-cached per host (a short TTL for moving aircraft and the ISS, a long one for place names) to respect Nominatim's ~1 request/second policy and to scale cheaply, sends a proper identifying `User-Agent` as that policy requires, and keeps each visitor's IP off the upstream providers. Each call is also time-boxed with a direct-fetch fallback, so a stalled network can't freeze startup and the app still runs from `file://` with no proxy at all.

### Cost, deployment & licensing

- **A single static file on Vercel's edge, auto-deployed from GitHub.** As a student with effectively no budget, a stateless static app on a free edge/CDN tier has no servers to run or scale, and the GitHub→Vercel link gives me deploys with no CI to maintain.
- **AGPL-3.0 with a commercial dual-licence.** Open-sourcing it maximises adoption and is honest portfolio evidence; AGPL's network-use clause means anyone embedding OVERHEAD in a closed product or service must either open-source their work *or* buy a commercial exemption from me — preserving a future revenue path while I (sole copyright holder) retain the right to grant it.

---

## Limitations — and why I haven't addressed them yet

I'd rather be honest about the edges than hide them.

- **No full daytime sky.** Deliberate: it's a *night-sky* ceiling projector, and a blue daylight sky is pointless on a ceiling. The solar-altitude groundwork is already in place if I change my mind.
- **Satellites are a simulated visual model, not a live TLE/SGP4 feed.** A real two-line-element feed plus an orbital propagator is on the list, but it adds weight and another data dependency for limited visible payoff — so it's deferred, not abandoned.
- **Overnight projection can be cut short by OS display sleep.** Browser tab-throttling isn't the problem (the output window stays visible), but the operating system can still sleep the display; I haven't yet wired up the Screen Wake Lock API to hold it awake.
- **Aircraft are stylised nav-light points today.** A self-modelled 3D Boeing 777-300ER plus a library of category silhouettes (airliner, widebody, helicopter, GA, business jet…) is the headline of v10 — this is effort/time, not budget; I'm building the model from scratch in Blender.
- **Southern-hemisphere constellation content is incomplete** (e.g. Crux, the Magellanic Clouds) — a content/time gap rather than an architectural one.
- **Public Nominatim caps at ~1 request/second.** Caching keeps me comfortably inside that at current scale; if the site got popular I'd self-host Nominatim or move to a paid geocoder — a cost I'm deliberately deferring until there's demand to justify it.
- **No volumetric clouds yet.** A raymarched cloudscape is designed but shelved: it carries real per-frame GPU cost and conflicts with the pure-black ceiling path.
- **No automated test/CI suite.** As a solo project built fast, my QA is field-testing on a real ceiling. I'd add CI before accepting outside contributions.

---

## Tech stack

Vanilla HTML/CSS/JS (single file) · Canvas2D · Web Workers · WebCodecs + webm-muxer (in-browser time-lapse) · VSOP87 astronomy · Vercel (static hosting + serverless proxy) · adsb.lol & Nominatim/OpenStreetMap data.

## Project layout

```
OVERHEAD/
├── index.html              # the entire app (UI, rendering, astronomy, sync)
├── api/proxy.js            # Vercel serverless proxy (allowlisted + edge-cached)
├── proxy.js                # local dev proxy (Node)
├── fonts/                  # self-hosted fonts (no third-party CDN calls)
├── vercel.json             # deploy config
├── PRIVACY.html            # privacy policy
├── TERMS.html              # terms of use (incl. safety disclaimer)
├── NOTICE.md               # third-party attributions (ODbL, OFL, MIT)
├── LICENSE.txt             # GNU AGPL-3.0 + commercial dual-licence
├── CHANGELOG.md
└── README.md
```

## License

OVERHEAD's source is free and open-source under the **GNU AGPL-3.0**, with a separate **commercial licence** available for proprietary use — see [`LICENSE.txt`](LICENSE.txt). Third-party components and data remain under their own licences — see [`NOTICE.md`](NOTICE.md).

## Credits

Live aircraft data © adsb.lol contributors (ODbL). Geocoding © OpenStreetMap contributors via Nominatim (ODbL). ISS positions via wheretheiss.at. Planetary theory: VSOP87. Time-lapse muxing: webm-muxer (MIT). Fonts under the SIL Open Font License. Full notices in [`NOTICE.md`](NOTICE.md).

## Author

Built by **Jash Patel** — [github.com/Jash2204](https://github.com/Jash2204).
