# Dependency security verification

Base `9b333bfcb11f560294abb01a32307704db72c56a` (PR #17). Audits run on 21 November 2026 using the npm registry and Node 24.22.1. Counts are npm package findings. Multiple packages can inherit one advisory from the same dependency.

| Scope | Previous report | Fresh base audit | Updated audit |
| --- | --- | --- | --- |
| Application lockfile | 23 (14 high, 7 moderate, 2 low) | 23 (14 high, 7 moderate, 2 low) | 0 |
| Runtime (`--omit=dev`) | 2 (1 moderate, 1 low) | 2 (1 moderate, 1 low) | 0 |
| Separate Wrangler lockfile | 0 | 0 | 0 |

The application lockfile is the only dependency file changed. Vite and ESLint remain within their declared major versions. ESLint 10.15.0 and its config-array dependency declare minimatch 11 upstream. jsPDF remains at 4.2.1 and its optional DOMPurify moved within the existing ^3.3.1 range. The final manifest is identical to the base and has no overrides. `npm ci` installs the reviewed versions, while a future lockfile regeneration needs a fresh audit.

## Exposure assessment

- **Quote PDFs:** jsPDF's optional HTML rendering brings in DOMPurify. The advisories require untrusted HTML or DOM input with options or operations such as in-place sanitization and hooks, allowed custom elements, HTML reparse, XHTML/SMIL, or safe-template shadow DOM handling. Digital Lab's quote generator uses jsPDF text and drawing APIs. Its caller is in the retired client portal, which has a loopback-only development recovery path. The built artifacts contain separate PDF and DOMPurify chunks. No active public HTML-to-PDF path was identified. The browser smoke called the quote generator directly with synthetic data and verified the downloaded PDF, keeping the portal closed.
- **Vite:** The direct issues concern reachable development server or editor endpoints. Some require Windows, particular editor invocation or custom middleware and affected route handling. Vercel and Cloudflare serve built assets and do not expose the Vite dev server. Local development and CI processing of changed source remain relevant.
- **CSS and source maps:** PostCSS requires an untrusted stylesheet or source-map reference reaching its build parser. Source-map-js requires an untrusted indexed map. Nanoid's reported issues concern invalid sizes passed to specific generator paths. These packages were only in the development tree. No browser path accepting those inputs was identified.
- **Lint/build input:** Minimatch and brace-expansion require costly glob or brace input. Browserslist requires distinct query patterns or untrusted custom stats and baseline-browser-mapping requires invalid input. Zod requires oversized data passed into affected validation paths. These risks concern development and CI processing of untrusted changes. No public request path into these dependencies was identified. PR validation remains credential-free and deploy jobs remain protected.

Zero findings is a registry result for these lockfiles. It gives no assurance about future disclosures or supply-chain compromise. Live Vercel and Cloudflare edge behavior was outside local verification.

## Base advisory mapping

Direct advisory ranges and severity come from the fresh audit. Inherited rows identify the dependency that carried the finding.

| Package | Scope and relationship | Base severity | Advisories and affected ranges, or inherited dependency |
| --- | --- | --- | --- |
| `@babel/core 7.29.7` | Build/dev, transitive dependency | high | via `@babel/helper-compilation-targets`<br>via `@babel/helper-module-transforms` |
| `@babel/helper-compilation-targets 7.29.7` | Build/dev, transitive dependency | high | via `browserslist` |
| `@babel/helper-module-transforms 7.29.7` | Build/dev, transitive dependency | high | via `@babel/core` |
| `@eslint-community/eslint-utils 4.9.1` | Build/dev, transitive dependency | moderate | via `eslint` |
| `@eslint/config-array 0.23.5` | Build/dev, transitive dependency | moderate | via `minimatch` |
| `@eslint/js 10.0.1` | Build/dev, direct dependency | moderate | via `eslint` |
| `@vitejs/plugin-react 6.0.2` | Build/dev, direct dependency | low | via `vite` |
| `baseline-browser-mapping 2.10.37` | Build/dev, transitive dependency | moderate | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) `>=2.0.0 <2.11.0` (moderate) |
| `brace-expansion 5.0.6` | Build/dev, transitive dependency | high | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) `>=3.0.0 <5.0.7` (high)<br>[GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) `>=4.0.0 <5.0.8` (high)<br>[GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) `>=4.0.0 <5.0.9` (high)<br>[GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) `>=4.0.0 <5.0.12` (moderate)<br>[GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) `>=4.0.0 <5.0.11` (high)<br>[GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) `>=4.0.0 <5.0.10` (high) |
| `browserslist 4.28.2` | Build/dev, transitive dependency | high | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) `<=4.28.6` (high)<br>[GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) `<=4.28.6` (high)<br>via `baseline-browser-mapping`<br>via `update-browserslist-db` |
| `dompurify 3.4.11` | Runtime, transitive dependency | moderate | [GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7) `<=3.4.12` (moderate)<br>[GHSA-c2j3-45gr-mqc4](https://github.com/advisories/GHSA-c2j3-45gr-mqc4) `<=3.4.11` (low)<br>[GHSA-6688-9rhm-gjv2](https://github.com/advisories/GHSA-6688-9rhm-gjv2) `<=3.4.15` (low)<br>[GHSA-c6gr-qvv4-5v3f](https://github.com/advisories/GHSA-c6gr-qvv4-5v3f) `<=3.4.16` (low)<br>[GHSA-cg2g-xh64-v4q7](https://github.com/advisories/GHSA-cg2g-xh64-v4q7) `>=3.4.4 <=3.4.16` (low)<br>[GHSA-mrv2-3pqr-j5jr](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr) `<=3.4.16` (low) |
| `eslint 10.5.0` | Build/dev, direct dependency | moderate | via `@eslint-community/eslint-utils`<br>via `@eslint/config-array`<br>via `minimatch` |
| `eslint-plugin-react-hooks 7.1.1` | Build/dev, direct dependency | high | via `@babel/core`<br>via `eslint`<br>via `zod`<br>via `zod-validation-error` |
| `eslint-plugin-react-refresh 0.5.2` | Build/dev, direct dependency | moderate | via `eslint` |
| `jspdf 4.2.1` | Runtime, direct dependency | low | via `dompurify` |
| `minimatch 10.2.5` | Build/dev, transitive dependency | high | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) `>=7.0.0 <11.0.1` (moderate)<br>via `brace-expansion` |
| `nanoid 3.3.12` | Build/dev, transitive dependency | high | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) `<3.3.16` (high)<br>[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) `<3.3.18` (high) |
| `postcss 8.5.15` | Build/dev, transitive dependency | high | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) `<=8.5.22` (moderate)<br>[GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) `<=8.5.17` (high)<br>via `nanoid`<br>via `source-map-js` |
| `source-map-js 1.2.1` | Build/dev, transitive dependency | high | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) `>=1.0.0 <1.2.2` (high) |
| `update-browserslist-db 1.2.3` | Build/dev, transitive dependency | high | via `browserslist` |
| `vite 8.0.16` | Build/dev, direct dependency | high | [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv) `>=8.0.0 <=8.1.5` (moderate)<br>[GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw) `>=8.0.0 <=8.1.5` (moderate)<br>[GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) `>=8.0.0 <=8.1.5` (high)<br>[GHSA-9jrq-w75r-8gcw](https://github.com/advisories/GHSA-9jrq-w75r-8gcw) `>=8.0.0 <=8.1.5` (low)<br>[GHSA-rq7h-c2jc-7f22](https://github.com/advisories/GHSA-rq7h-c2jc-7f22) `>=8.0.0 <=8.1.5` (moderate)<br>via `postcss` |
| `zod 4.4.3` | Build/dev, transitive dependency | high | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) `<4.6.6` (high) |
| `zod-validation-error 4.0.2` | Build/dev, transitive dependency | high | via `zod` |

## Exact lockfile version changes

The lockfile includes supporting dependencies required by the updated Vite/Rolldown, ESLint and browser-data trees. Platform-specific entries are listed separately.

| Lockfile package path under `node_modules/` | Base | Updated |
| --- | --- | --- |
| `@cacheable/memory` | — | 2.2.0 |
| `@cacheable/utils` | — | 2.5.0 |
| `@emnapi/core` | 1.10.0 | 1.11.1 |
| `@emnapi/runtime` | 1.10.0 | 1.11.1 |
| `@emnapi/wasi-threads` | 1.2.1 | 1.2.2 |
| `@eslint/config-array` | 0.23.5 | 0.23.6 |
| `@eslint/config-helpers` | 0.6.0 | 0.7.0 |
| `@eslint/plugin-kit` | 0.7.2 | 0.7.3 |
| `@isaacs/nonrecursive-glob-match` | — | 1.1.0 |
| `@keyv/bigmap` | — | 1.3.1 |
| `@keyv/serialize` | — | 1.1.1 |
| `@napi-rs/wasm-runtime` | 1.1.5 | 1.1.6 |
| `@oxc-project/types` | 0.133.0 | 0.139.0 |
| `@rolldown/binding-android-arm64` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-darwin-arm64` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-darwin-x64` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-freebsd-x64` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-arm-gnueabihf` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-arm64-gnu` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-arm64-musl` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-ppc64-gnu` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-s390x-gnu` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-x64-gnu` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-linux-x64-musl` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-openharmony-arm64` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-wasm32-wasi` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-win32-arm64-msvc` | 1.0.3 | 1.1.8 |
| `@rolldown/binding-win32-x64-msvc` | 1.0.3 | 1.1.8 |
| `@tybys/wasm-util` | 0.10.2 | 0.10.5 |
| `baseline-browser-mapping` | 2.10.37 | 2.11.0 |
| `brace-expansion` | 5.0.6 | 5.0.13 |
| `browserslist` | 4.28.2 | 4.28.7 |
| `cacheable` | — | 2.5.0 |
| `caniuse-lite` | 1.0.30001799 | 1.0.30001826 |
| `dompurify` | 3.4.11 | 3.4.17 |
| `electron-to-chromium` | 1.5.372 | 1.5.492 |
| `eslint` | 10.5.0 | 10.15.0 |
| `file-entry-cache` | 8.0.0 | 11.1.5 |
| `flat-cache` | 4.0.1 | 6.1.23 |
| `flatted` | 3.4.2 | 3.4.4 |
| `hashery` | — | 1.5.1 |
| `hookified` | — | 1.15.1 |
| `json-buffer` | 3.0.1 | — |
| `keyv` | 4.5.4 | 5.6.0 |
| `minimatch` | 10.2.5 | 11.0.9 |
| `nanoid` | 3.3.12 | 3.3.18 |
| `node-releases` | 2.0.47 | 2.0.65 |
| `picomatch` | 4.0.4 | 4.0.7 |
| `postcss` | 8.5.15 | 8.5.23 |
| `qified` | — | 0.10.1 |
| `qified/node_modules/hookified` | — | 2.2.0 |
| `rolldown` | 1.0.3 | 1.1.8 |
| `source-map-js` | 1.2.1 | 1.2.2 |
| `vite` | 8.0.16 | 8.1.6 |
| `zod` | 4.4.3 | 4.6.6 |

## Local verification

- Node 24 clean install from the lockfile and `npm ls --all` passed. The local Playwright download returned HTTP 403, so the dependency install skipped lifecycle scripts and the browser checks used system Chromium 156 through Playwright. The supported Node 22.17.0 minimum satisfies the declared engine ranges of all changed resolutions.
- The 116 unit tests, release and pricing checks, privacy date format check, `actionlint` for both workflows, and diff whitespace checks passed.
- The normal, Cloudflare TEST and FAILOVER builds each prerendered 14 routes. Both standby artifacts passed the release artifact check and contained 145 files. The maximum asset was 8,411,382 bytes. All nine built MP4 files in each mode matched their optimized sources byte for byte.
- Desktop and mobile browser checks passed for pricing, repair diagnostics, service packages, consent, the retired portal, Audit funnel, Cloudflare TEST and FAILOVER, and all seven active videos across the three builds. The standby checks covered 14 canonical routes, hard reloads, inert TEST submissions, and FAILOVER activation by hostname.
- The browser generated a 14,407-byte quote PDF with the expected download filename, PDF header, page declaration and trailer.
- The legacy header check returned 147px versus its 150px assertion at the base and on this branch. Comparing the same tracked source paths with the two locked ESLint versions gave identical diagnostics (13 errors and 3 warnings). These existing findings remain outside this dependency change.
