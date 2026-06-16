# OVERHEAD — Notices & Attribution

OVERHEAD ("the App", https://overhead.world) is built on open data and open-source
work. This file records the attribution and licence notices that those sources
require. It is part of the v9 release.

---

## Live data

### Aircraft positions — adsb.lol
Live ADS-B aircraft positions are provided by **adsb.lol**.
adsb.lol data is made available under the **Open Database License (ODbL) v1.0**.
Contains information from adsb.lol, which is made available under the ODbL.
- Licence: https://opendatacommons.org/licenses/odbl/1-0/
- Source: https://adsb.lol

### Geocoding & place names — OpenStreetMap / Nominatim
Location names are resolved using the **Nominatim** service, which is built on
**OpenStreetMap** data.
**© OpenStreetMap contributors.** OpenStreetMap data is available under the
**Open Database License (ODbL) v1.0**; the produced cartography/derived data is
available under the Open Data Commons / CC BY-SA terms as applicable.
- Licence: https://www.openstreetmap.org/copyright
- Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/

OVERHEAD respects the Nominatim usage policy: requests are rate-limited and
coordinate-rounded client-side, cached, sent with an identifying `User-Agent`,
and routed through OVERHEAD's own caching proxy.

---

## Astronomical methods

- **Planetary positions** use the **VSOP87** planetary theory
  (P. Bretagnon & G. Francou, *Bureau des Longitudes*, 1988).
- Sidereal time, solar position, lunar phase and rise/set geometry use standard
  published astronomical algorithms.
- Named-star and constellation geometry derive from standard public-domain
  bright-star catalogue data.

---

## Software

### webm-muxer
The time-lapse recorder muxes WebM using **webm-muxer** by Vanilagy.
Licensed under the **MIT License**. Full text: `THIRD-PARTY-LICENSES/webm-muxer-LICENSE.txt`.
- Source: https://github.com/Vanilagy/webm-muxer

---

## Fonts (self-hosted)

Both fonts are licensed under the **SIL Open Font License, Version 1.1**
(https://scripts.sil.org/OFL) and are served locally from `/fonts` (no
third-party font CDN is contacted).

- **Share Tech Mono** — Copyright © 2012 Carrois Type Design, Ralph du Carrois,
  with Reserved Font Name "Share".
- **Rajdhani** — Copyright © 2014 Indian Type Foundry.

---

OVERHEAD's own code is © 2026 Jash Patel and licensed under the **GNU AGPL-3.0**,
with a separate commercial licence available for proprietary use (see `LICENSE.txt`).
The third-party components credited above remain under their respective licences.
