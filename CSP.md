# Content-Security-Policy — enabled

The policy lives in `vercel.json` and is **enforcing** (not report-only). This file records
what each clause is for and what was actually tested, so a future change to the app can be
checked against it.

## The policy

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
media-src 'self' blob:;
frame-ancestors 'self';
base-uri 'self';
form-action 'none';
object-src 'none'
```

## What this actually buys us

Be honest about this: **the `script-src` clause is close to worthless here.** The whole app is
one file — all three script blocks and the entire stylesheet are inline — so the policy has to
allow `'unsafe-inline'` for OVERHEAD's own code to run, and that is exactly the permission an
injected script would use.

The value is in the other clauses, and `connect-src 'self'` is the important one.

Since the direct-to-upstream fallback was removed, the app only ever fetches same-origin
`/api/proxy?…`. Setting `connect-src 'self'` means the **browser** now refuses to let the page
contact adsb.lol, Nominatim or anyone else directly. `PRIVACY.html` says the data providers
never see a visitor's connection; that used to be true because of how the code was written,
and is now true because the browser will not permit otherwise — including if a future edit
accidentally reintroduces a direct call. It enforces Branch A rather than merely documenting it.

`frame-ancestors`, `object-src`, `base-uri` and `form-action` are cheap and unconditional.

## Why each clause is the shape it is

| Clause | Reason |
|---|---|
| `script-src 'unsafe-inline'` | The three inline blocks, **and** `ensureMuxer()` promoting `<script type="text/plain" id="webm-muxer-src">` into a real `<script>` on first RECORD. |
| `style-src 'unsafe-inline'` | The stylesheet is inline; several elements also get `style` attributes from JS (`#legal`, corner-pin transform, calibration handles). |
| `img-src data: blob:` | The five aircraft sprites and the favicon are inline base64 data URIs. `blob:` is there for canvas-derived images. |
| `connect-src 'self'` | See above. Deliberately **not** listing the four upstream hosts — that would weaken the guarantee for no benefit, since nothing fetches them directly any more. |
| `worker-src blob:` | Two workers are built from blob URLs: the aircraft feed (`initPlaneWorker`) and the OPFS writer (`makeWorker`). |
| `media-src blob:` | The time-lapse is assembled as a blob. |
| `frame-ancestors 'self'` | Modern equivalent of the `X-Frame-Options: SAMEORIGIN` also set. Both kept while old browsers matter. |
| `form-action 'none'` / `object-src 'none'` | No forms, no plugins. |

## What was tested before enabling

Run against a local simulator serving the static site, the real `api/proxy.js` handler and the
`vercel.json` headers all on **one origin**, so it matches production rather than a static
server with the headers bolted on.

- 254 aircraft through the blob-URL feed worker; ISS `LIVE`; route lookup `VIR11B → LHR–BOS`
- All three `@font-face` files loaded under `font-src 'self'`
- Both projections drew; footer links present
- **Full tier-1 recording**: inline-script promotion of the muxer, OPFS blob-URL worker running,
  WebCodecs encoder configured, a real frame encoded (11,965 bytes written to OPFS), then
  STOP → save completed and cleared the crash marker
- Isolated probes: blob-URL worker round-trip returned `pong`; a dynamically created inline
  `<script>` executed
- **Zero `securitypolicyviolation` events throughout**

## The one thing this blocks: the localhost dev proxy

`connect-src 'self'` blocks `http://localhost:3001` — a different port is a different origin.
That is **not** a production concern (the `isLocal` guard in `proxiedCandidates()` means the
3001 candidate is only ever generated when running locally), and it does not affect the normal
local workflow either, because a plain static server does not apply `vercel.json` headers at
all. Under `vercel dev` the same-origin `/api/proxy` succeeds first, so 3001 is never reached.

It only bites if you serve locally through something that *does* apply these headers but does
*not* provide `/api/proxy`. If you hit that, the symptom is a silent empty sky with
`connect-src` violations in the console — serve the API too, or drop the header locally.

## Not done, and worth doing later

- **Nonces or hashes instead of `'unsafe-inline'`** — the real fix, but it needs a per-response
  nonce, which means putting `index.html` behind a function and giving up the single-file,
  static-host property the project is built on.
- **`report-uri` / `report-to`** — no reporting endpoint exists, so violations from real
  visitors are invisible. Worth adding if the policy is ever tightened further.

## Also considered for `Permissions-Policy`, not added

Verified unused in the code (0 occurrences each), and could be denied alongside the current
list if you want it longer: `bluetooth=()`, `serial=()`, `midi=()`, `hid=()`,
`idle-detection=()`, `xr-spatial-tracking=()`.

`browsing-topics=()` opts out of Chrome's Topics API. Defensible given OVERHEAD's positioning,
but non-standard, so it is left out as a deliberate choice rather than an oversight.
