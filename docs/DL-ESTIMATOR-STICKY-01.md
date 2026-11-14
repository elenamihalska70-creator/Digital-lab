# DL-ESTIMATOR-STICKY-01 — local review

Base: origin/main = 65ae6ed1af62a07f46e623471f281a9f2e31cf93, fetched and verified as the approved PR #6 merge.
Branch: feat/dl-estimator-sticky-01.
Worktree: C:/Users/Lenovo/Projets/DigitalLab-estimator-sticky-01.
Status: local validation snapshot prepared for an owner-authorized scoped commit, normal push and review PR. No merge, production deployment or database change is authorized.

## Smallest implementation

UnifiedEstimator already renders every category from the shared estimator state. Its existing sticky result was blocked by overflow:hidden on both the panel and section and used fixed offsets (including a separate repair offset).

Change only presentation: use overflow:clip on these two containers, measure the actual navbar bottom with ResizeObserver and scroll/resize listeners, and apply sticky within the estimator grid. The card stops at the grid boundary, before contact guidance and unrelated content. Preserve the single existing result DOM, live region, wording, focus order and quote actions.

At <=960px retain the existing full inline summary. The existing mobile fixed CTA already occupies the bottom safe-area edge. No second bottom overlay is introduced. On any viewport, if the whole summary cannot fit below the header, use normal document flow instead of hiding actions or creating an inner scroll area. This means long combined project/social/Reels summaries and short windows do not remain sticky.

## Files

- src/App.jsx: result ref and geometry observer; no estimate, quote, email, repair or commercial logic changes.
- src/App.css: scoped overflow/position rules.
- scripts/check-sticky-ui.mjs: isolated browser fixture, reference captures and geometry checks.
- docs/DL-ESTIMATOR-STICKY-01.md: this review.

No diff in src/utils, src/config, api, package.json or package-lock.json.

## Validation

- npm test: 96/96 PASS.
- npm run check:release: PASS, including approved pricing lock and VAT/mailto contracts.
- npm run build: PASS; 14 routes prerendered, including final CSS correction.
- npm run check:pricing:ui: PASS. Integrated FR/EN at 1440/390; website package prices, extras, summary/copy/mailto/fallback, Social/Reels CTA presets and billing separation.
- Repair browser regression: PASS. Integrated FR/EN at 1440/390/320; 70/650/technical/urgent classifications, long details, switching, email/copy, focus and no privacy/storage/external-write regressions.
- node scripts/check-header-ui.mjs: PASS. Six requested widths, both languages, guest and synthetic client/admin; menu, keyboard order, anchors, normal/reduced motion and dynamic header geometry.
- Sticky fixture: PASS before and after, 216 combinations per phase (6 project categories x 6 widths x 2 languages x 3 account states). Scroll down/up, header clearance during sticking, bottom containment, inline mobile fallback, no nested summary scrolling, no horizontal overflow, no browser errors.
- Dedicated Social Media/Reels fixture: 24 combinations per phase; live service changes and sticky/inline geometry.
- Supplemental normal-motion fixture: PASS, 12 language/width combinations. Website package update changes displayed summary immediately; quote button keyboard focus is visible after scrolling settles; combined tall summary becomes inline at 500px window height. Script and measurements are local artifacts.
- git diff --check: PASS.

Review-PR preflight reran npm test (96/96), check:release, build (14 routes), pricing/repair browser regressions, and the final sticky suite (288 combinations: 216 project + 72 Social Media/Reels account-state cases). All passed. The four-file index excludes all generated artifacts and has no detected private-key/PAT/AWS-key/live-key/JWT patterns.

The first concurrent header regression sampled 149.265625px at 1280px and failed its unchanged <=120px compact-height assertion. A dedicated trace showed scrollY fixed at 800, the is-scrolled class applied, and height settling to 116px by the later sample. The unchanged full header regression subsequently passed when rerun alone across all six widths, both languages, guest/client/admin fixtures and normal/reduced motion; no threshold or header implementation changes were made.

Widths: 1680, 1440, 1280, 1180, 390, 320. Main fixture height: 1000px. Account sessions are synthetic, not real authenticated accounts. Browser routes block external network and non-GET/HEAD requests; WebSockets are closed.

## Review artifacts

Ignored local folders, intentionally not included in the source diff:

- sticky-review.local/before-measurements.json and after-measurements.json
- sticky-review.local/before-content-measurements.json and after-content-measurements.json
- sticky-review.local/interactions.json
- sticky-review.local/{before,after}-{FR,EN}-{width}-category{1..6}.png
- sticky-review.local/{before,after}-{FR,EN}-{width}-content{1,2}.png
- header-review.local/after-measurements.json and screenshots

Representative comparison: before-FR-1680-category1.png / after-FR-1680-category1.png. Repair: after-FR-1180-category2.png.

The --before fixture is pinned to approved base 65ae6ed1af62a07f46e623471f281a9f2e31cf93, including after committing this LOT.

Reproduce main matrix: node scripts/check-sticky-ui.mjs --before; node scripts/check-sticky-ui.mjs.
Content-only matrix: add --content-only (run phases sequentially).
The supplemental interaction script in sticky-review.local expects the after fixture server on port 4327.

## Limits and risks

- Mobile intentionally uses the allowed inline fallback; no compact bottom bar or expandable overlay was added.
- Desktop sticky is conditional on fitting the available height. Long combined summaries remain fully accessible inline.
- No physical iOS/Android keyboard or safe-area device test; a short browser viewport is only a proxy. Native keyboard, actual cookie-banner combinations and real authenticated sessions are not proven.
- Geometry matrix uses the real components in a synthetic isolated fixture. Integrated pricing/repair/header regressions provide separate page-level coverage, not every possible option combination at every width.
- Build emits the existing large-chunk advisory. npm ci reported 12 dependency audit findings (4 moderate, 7 high, 1 critical); no dependency or lockfile changes were made in this LOT.
- Existing dirty main and pricing work remain outside this LOT. No file mutation commands targeted the existing pricing, repair or header worktrees. Fetch/worktree creation necessarily updated shared Git metadata as authorized.
