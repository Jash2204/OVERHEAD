# Content-Security-Policy — draft, NOT enabled

This is a candidate CSP for OVERHEAD, written for review. **It is deliberately not in
`vercel.json`.** Enabling it as written will not break the app, but every clause below exists
because of something specific in the code, and each one needs checking against the live site
before it goes anywhere near production.

## Why it isn't enabled

Three things in OVERHEAD are hostile to a strict CSP:

1. **`ensureMuxer()` promotes an inline script.** webm-muxer ships as
   `<script type="text/plain" id="webm-muxer-src">` and is copied into a real `<script>` element
   via `textContent` on first RECORD press. That is an inline script execution, so it needs
   `'unsafe-inline'` (or a nonce/hash — see below).
2. **Two Workers are created from `blob:` URLs** — the aircraft feed worker in
   `initPlaneWorker()`, and the OPFS write worker in the time-lapse recorder (`makeWorker()`).
   Both need `worker-src blob:`.
3. **The whole app is inline.** All three script blocks and the entire stylesheet are inline in
   `index.html`, so `script-src` and `style-src` both need `'unsafe-inline'` unless the build
   changes.

A CSP with `script-src 'unsafe-inline'` blocks very little script injection, so the honest
assessment is that this policy's value is mostly in `connect-src`, `frame-ancestors`,
`object-src` and `base-uri` — not in `script-src`.

## Candidate policy

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self' https://api.adsb.lol https://api.wheretheiss.at https://nominatim.openstreetmap.org https://vrs-standing-data.adsb.lol;
worker-src 'self' blob:;
media-src 'self' blob:;
frame-ancestors 'self';
base-uri 'self';
form-action 'none';
object-src 'none'
```

### Clause-by-clause rationale

| Clause | Why |
|---|---|
| `script-src 'unsafe-inline'` | Required by the three inline blocks **and** by `ensureMuxer()`'s script promotion. |
| `style-src 'unsafe-inline'` | The whole stylesheet is inline; several elements also set `style` attributes from JS (`#legal`, corner-pin transform, calibration handles). |
| `img-src data:` | The five aircraft sprites are inline base64 data URIs, as is the favicon. |
| `connect-src` upstream hosts | **Probably removable.** Since Branch A, the app only ever fetches same-origin `/api/proxy?…`. The four hosts are listed defensively in case a direct hop is ever reinstated; if you are confident Branch A is permanent, cut them and leave `'self'`. Note this also means `connect-src 'self'` alone would *enforce* Branch A at the browser level — arguably a feature. |
| `worker-src blob:` | Aircraft worker + recorder OPFS worker. Without it both silently fail (the aircraft one falls back to inline fetch; the recorder drops to a lower tier). |
| `media-src blob:` | Time-lapse output is assembled as a blob. |
| `frame-ancestors 'self'` | Modern equivalent of the `X-Frame-Options: SAMEORIGIN` already set in `vercel.json`. Keep both while older browsers matter. |
| `form-action 'none'` | The app has no `<form>`. |
| `object-src 'none'` | No plugins, ever. |

### Not included, and why

- **`report-uri` / `report-to`** — would need an endpoint to collect reports. Worth adding
  *before* enforcement, in `Content-Security-Policy-Report-Only` mode, so you can see what breaks
  on real traffic rather than guessing.
- **Nonces or hashes instead of `'unsafe-inline'`** — the correct fix, but it needs the inline
  blocks to be given a per-response nonce, which a static deploy cannot do without moving
  `index.html` behind a function. That trades away the single-file/static-host property the
  project is built on.

## Suggested rollout

1. Ship as `Content-Security-Policy-Report-Only` first, with a reporting endpoint.
2. Watch real traffic for at least a few days — particularly a full time-lapse recording, a
   Ceiling Mode session, and a mobile visit, since those exercise the workers and the muxer
   promotion.
3. Only then switch the header name to `Content-Security-Policy`.

## Also considered for `vercel.json`, not added

These were verified unused in the code (`0` occurrences each) and could be denied in
`Permissions-Policy` alongside the current four, if you want a longer list:
`bluetooth=()`, `serial=()`, `midi=()`, `hid=()`, `idle-detection=()`, `xr-spatial-tracking=()`.

`browsing-topics=()` is a Chrome-proprietary token that opts the site out of the Topics API.
Given OVERHEAD's privacy positioning it is defensible, but it is non-standard, so it is left out
of the default set as a deliberate choice rather than an oversight.
