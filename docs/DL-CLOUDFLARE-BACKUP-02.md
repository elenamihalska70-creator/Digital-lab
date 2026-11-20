# Cloudflare Pages standby artifacts

These are local builds for Cloudflare Pages Free Direct Upload. The default `npm run build` still writes `dist` for Vercel and publishes the same optimized videos as the Cloudflare builds. Neither Cloudflare artifact requires a server, Pages Functions, production credentials, or a DNS change to test.

## Prepare and verify

Use Node 24, the locked npm dependencies, and a working Playwright Chromium. From the repository root:

```sh
npm ci
npm run build:cloudflare -- TEST
npm run build:cloudflare -- FAILOVER
node scripts/check-cloudflare-ui.mjs
```

The commands generate `cloudflare-TEST.local/` and `cloudflare-FAILOVER.local/`. The `_standby-artifact.json` marker is written only after a successful build and size validation. Upload the contents of the intended directory, including `_headers`, `404.html`, the marker, and the assets. Never upload a partial directory or `dist` to the standby project. Build one invocation per mode at a time. Vite publishes the checked-in web derivatives at the existing video paths. Original sources are retained in the repository.

| Output | Intended use | Live actions |
| --- | --- | --- |
| `cloudflare-TEST.local/` | Isolated `pages.dev` review | Disabled on every hostname. The visible TEST notice identifies inert links. The TEST header also blocks connection APIs and form submissions. |
| `cloudflare-FAILOVER.local/` | Owner-approved activation on the existing public domain | Inert on `pages.dev` and other non-production hosts. Live actions resume only after JavaScript runs on an approved production hostname. Prerendered HTML starts with inert links so a standby URL is safe before JavaScript runs. |

Keep these artifacts separate. Review the marker and identify the selected directory before each manual upload. TEST also disables GA4 initialization if uploaded to a production hostname in error. FAILOVER keeps the existing host allowlist and consent behavior. The built-in production Audit app URL is used for FAILOVER. Verify that this is the intended production destination before activation.

## Expected Pages behavior

- All 14 public routes have static HTML and production canonicals. Pages may redirect directory routes to their trailing-slash form. Retired login, dashboard, client-area and admin routes have prebuilt retirement notices and noindex metadata.
- A top-level `404.html` disables the automatic SPA fallback for unmatched paths. Both obsolete mail API URLs and unknown routes should return 404 on GET and HEAD. Check non-GET methods on the real Pages test site before release. They must never return a successful HTML response.
- The two hostname-scoped `_headers` rules cover project and deployment hosts under `pages.dev`; neither rule applies to the production custom domain. Keep production canonicals and verify the actual response headers on the project URL, a deployment alias and, during an approved activation, the custom domain. A local fixture checks the intended behavior; it does not run Cloudflare's edge.
- Exact Vercel-style 410 JSON would require a separately reviewed response handler such as two narrow Pages Functions. That would require Wrangler with a configured Functions directory; dashboard drag-and-drop cannot compile it. The static standby selects 404 and does not include Functions.

Keep refreshes manual and tied to approved source SHAs. After each upload, repeat routing, indexing, media and action checks on the isolated test host. Production DNS and provider disclosure changes require separate owner approval.
