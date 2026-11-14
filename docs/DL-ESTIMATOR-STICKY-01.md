# DL-ESTIMATOR-STICKY-01 — PR #7 local correction

Scope: current worktree DigitalLab-estimator-sticky-01, branch feat/dl-estimator-sticky-01, starting HEAD e89700dfc3847b80f33e361d2e4a4bf4ccf0be1a. Validation snapshot for the owner-approved focused corrective commit and normal push to existing PR #7. No merge, production deployment or database change is authorized.

## Findings from the real page

The previous fixture allowed data-sticky-fits=false and therefore could pass even when the result disappeared. Its 1000px-tall viewport also missed the reported height sensitivity. The new regression mounts the real page, with actual page content, reveal effects, header and estimator; it does not replace them with a synthetic fixture or override their styles.

The reported choices are selected: repair, Other / unsure, Targeted intervention, Custom website. A normal urgency is also selected in the after tests so the quote action can be checked in a complete scenario; routing remains technical/on quote.

Measurements of the published source at e89700d, using a guest session and 100% browser scale:

| Case, scroll 650px below grid start | Full card | Header bottom / offset | fits / position | Card top | CTA top | Grid bottom |
| --- | --- | --- | --- | --- | --- | --- |
| Before, 1686 x 896 | 626.80px | 77px / 93px | true / sticky | -55.47px | 434.33px | 571.33px |
| Before, 1686 x 700 | 626.80px | 77px / 93px | false / static | -650.28px | -160.48px | 571.30px |
| After, 1686 x 896 | 332.19px | 77px / 93px | true / sticky | 93px | 230.19px | 571.33px |
| After, 1686 x 700 | 332.19px | 77px / 93px | true / sticky | 93px | 230.19px | 571.30px |

Two mechanisms matter: a full-height card can hit its grid's bottom boundary early even with fits=true; when usable height is insufficient, fits=false disables sticking entirely. Ancestors were measured: grid/section-inner/main have visible overflow, panel and estimator section use clip, and the body has hidden horizontal / auto vertical overflow. No additional estimator overflow scroll ancestor was found.

The owner's exact complete-disappearance observation was not reproduced identically at a local 896px viewport: fits remained true there, and the CTA remained visible at the sampled 650px scroll even though the category was already above the header. The 700px usable-height case reproduces complete disappearance while questions remain visible. A direct automated attempt against the protected Preview did not load the estimator, so no claim of exact remote reproduction is made. The correction addresses both measured mechanisms without assuming the owner's browser viewport or session state.

## Implementation

- Keep a compact category/service and live-price overview, the original quote CTA, repair email action and an explicit View full estimate and terms button in the existing result card.
- Show the complete existing estimate, explanation, commercial terms, launch/standard prices, first-month breakdown, delay and VAT in a labeled native modal dialog. Native modal behavior supplies background inertness, Escape handling and focus restoration. Its own bounded document reader scrolls when needed; the compact price card has no inner scroll area.
- Preserve the full original estimate/terms JSX exactly after normalizing line endings and relocating aria-live to the visible compact overview. No numerical price, engine, VAT, quote/email, repair routing or privacy code was changed. Display formatting reads the same estimate object; no extra estimator state or calculation is introduced.
- Measure only the compact card for sticky fit. Long terms cannot disable sticky or shift the document when opened. Keep the existing inline fallback at <=960px and when even the compact card does not fit a genuinely short viewport (tested at 360px height).
- Leave header/auth components and the mobile fixed CTA unchanged. Existing observer/listener cleanup is preserved.

## Validation

- npm test: 96/96 PASS.
- npm run check:release: PASS, including pricing lock and VAT/mailto contracts.
- npm run build: PASS, 14 prerendered routes; existing large-bundle advisory remains.
- npm run check:pricing:ui: pricing portion PASS for integrated FR/EN 1440/390, including packages, extras, mailto/copy/fallback and social-page presets. The initial repair capture expected an always-visible full result and failed after it moved into the dialog. The repair regression was adapted to open the actual dialog, assert visibility, retain every existing commercial/privacy assertion, and capture the visible detail. Standalone node scripts/check-repair-ui.mjs then PASS for FR/EN at 1440/390/320, with zero errors/writes.
- node scripts/check-sticky-ui.mjs: PASS, 288 fixture category/language/width/account-state combinations. This is supplementary coverage; the real-page suite is the regression for the owner's failure.
- node scripts/check-sticky-real-ui.mjs: PASS, 126 real-page scroll/combined measurements across 18 language/viewport/motion scenarios. Widths 1686, 1440, 1280, 1180, 390, 320; desktop heights 896/900 and 700; genuinely short height 360. Normal and reduced motion covered. Assertions require desktop sticky=true, service/price and quote CTA in view at each sampled position, no grid movement during scrolling, and inline mobile/short-height fallback.
- Real-page suite also checks all six project categories, immediate website package updates, Social Media/Reels updates, compact/detail price equality, a combined repair + social + setup-fee result, labeled dialog access, native :modal state, keyboard containment (full Tab and Shift+Tab cycles never reach a background element; a single browser-chrome stop at the cycle edge must return straight into the dialog), inert background CTA/details button for programmatic focus and pointer, Escape and focus restoration, unchanged page scroll on opening/closing, and no horizontal overflow in the page or dialog. Mutation check: forcing a non-modal dialog.show() fails both the :modal assertion and, independently, the focus-containment assertion (focus reached the background contact link).
- Full estimate/terms source comparison: identical after LF normalization and removal of the old hidden live-region attribute. No diff in src/utils, src/config, api, package.json or package-lock.json.
- git diff --check: PASS. Corrective diff reviewed against e89700d; publication preflight reruns these checks before committing.

## Files and artifacts

Changed: src/App.jsx, src/App.css, scripts/check-repair-ui.mjs, docs/DL-ESTIMATOR-STICKY-01.md. Added: scripts/check-sticky-real-ui.mjs.

Ignored local evidence: sticky-real-review.local/before.json, after.json, before-FR-1686x{896,700}-scroll650.png, after-FR-1686x{896,700}-scroll650.png, after-{FR,EN}-{width}x{height}-repair.png and -details.png. The --before suite pins the published PR #7 source; it does not modify files. Reproduce with node scripts/check-sticky-real-ui.mjs --before, then node scripts/check-sticky-real-ui.mjs.

## Limits

The owner has authorized publishing this corrective diff to the PR Preview. Functional owner confirmation against that updated Preview remains distinct from exact-SHA build readiness. Real authenticated sessions, physical mobile keyboards/safe areas and assistive-technology devices were not tested. Browser coverage is automated Chromium plus local screenshot inspection. Very short viewports intentionally use normal document flow. The details dialog is an intentional presentation change; long full quotes scroll inside the dialog while the underlying estimator is modal/inert. Existing dependency audit findings and bundle warnings remain outside this fix. No original main or previous feature worktree was changed.
