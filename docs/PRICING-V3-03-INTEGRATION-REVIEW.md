# DL-PRICING-V3-03 - integration review

Status: implemented locally for owner review. No commit, push, merge or deployment.

## Base and isolation

- Branch: fix/dl-pricing-v3-integration.
- Worktree: C:/Users/Lenovo/Projets/DigitalLab-pricing-v3-integration.
- Exact HEAD/base: b083723248ecf9bd72999cad35b37192ab18841c. Live GitHub main matched before creation and again after implementation.
- Original dirty main stays at 5b710a112dd92905f58641b9ae0be1ae5f817b52. Its original status and all 174 inventoried tracked/untracked paths (including absent files) match the before inventory. No existing files were restored, deleted or staged.
- Inventory evidence: C:/Users/Lenovo/AppData/Local/Temp/DL-PRICING-V3-03-review/dirty-main-inventory-before.json and dirty-main-preservation-after.json.

## Behavior

Only the exact need "Créer un site web" uses V3: 390 EUR for one page, 590 EUR for up to 3, 890 EUR for up to 5. The initial choice is one page. Responsive, basic SEO, a simple contact form and minor adaptation of supplied materials are included. Creating content from scratch and complex features are additional. Page count does not incur a second Standard-complexity surcharge. Website urgency is applied once, then rounded up to a whole euro.

Other one-off services keep production surcharges, repeated-feature behavior, 50 EUR rounding, delays and levels. All production exports are preserved. The source from the recurring Social Media section through getUnifiedEstimate is byte-for-byte unchanged after LF normalization. Social Media launch/reference prices, Reels and first-month calculation are unchanged.

The production UnifiedEstimator receives page count and returns it through getProjectEstimate. buildEstimateRequest includes the maximum page count only for a website. The existing summary, QuoteEmailPanel, clipboard, mailto fallback and tax formatter remain in use. No legacy ContactForm or email route is restored.

## Scope

Modified: package.json, src/App.jsx, src/utils/estimator.js, src/utils/estimator.test.js.

Added implementation/contract files: src/utils/websitePricing.js, src/utils/estimator.compatibility.test.js, scripts/pricing-lock.mjs, scripts/pricing-lock.test.mjs, scripts/check-pricing.mjs, scripts/check-pricing-ui.mjs, .github/workflows/pricing.yml, docs/pricing-v3-lock.json, PRICING-V3-LOCK.md.

Review artifacts: this report, PRICING-V3-03-EXAMPLES.json, PRICING-V3-03-INTEGRATION.diff. The diff includes all other LOT files and excludes itself.

Unchanged versus b083723: App.css, index.html, public/**, api/** (including email handlers), quoteMailto.js, taxMention.js, scripts/check-release.mjs and package-lock.json. No dependency upgrade, GitHub protection setting or production write.

## Verification

- npm test: PASS, 79/79; retains legacy-email, tax, tracking, quote-mailto and all recurring/unified tests.
- Non-website golden contract: 69,255 combinations, all feature subsets plus repeated-feature cases; budgets, rounding, delays and levels match a digest captured from production BEFORE editing.
- Social/Reels golden contract: 900 option combinations through both social and unified APIs, plus all standalone offers and Reel quantities 0-24; matches production.
- npm run build: PASS; Vite plus prerender of all 14 production routes, including Social Media. Existing >500 kB chunk warning remains.
- npm run check:release: PASS; unchanged TVA gate confirms FRANCHISE, then pricing lock.
- Pricing UI: PASS on FR/EN at 1440 and 390 px. Verifies package labels, selected states, 390/590/890/back, included features, urgency, content, payment/advanced extras, summary/page count, clipboard, long mailto fallback, tax notes, monthly separation, removal of page count outside website mode, no legacy contact form and no horizontal overflow. Also checks the Social Media page's plan/Reels CTA presets and combined website quote.
- Browser guard is installed before navigation: only local GET/HEAD allowed, external HTTP and all WebSockets blocked. Mailto clicks are intercepted and clipboard mocked. No external write/send or actual mail client opening.
- npm run lint: FAIL with the same 13 errors and 3 warnings as untouched b083723. All diagnostics, including embedded source frames, match after normalizing shifted line numbers. No rule is disabled and no unrelated fix is included. Baseline/after JSON lives beside the inventory in TEMP.
- Targeted ESLint for changed/new estimator logic, config, tests and scripts: PASS. App.jsx retains its pre-existing diagnostics.
- git diff --check: PASS. No staged changes.

## Price lock and CI

The original production npm test list is extended, not replaced. check:release runs scripts/check-release.mjs before check:pricing. CI runs npm ci, tests, combined release gate, build and the guarded browser suite. CI has not run remotely because nothing was pushed.

The lock pins websitePricing.js, the complete estimator, and preserved quoteMailto/tax/release-gate modules. Missing lock entries, accidental code changes and CRLF portability are tested. A test explicitly demonstrates that a rewritten expected checksum can accept changed code: this is drift detection, not proof of owner consent. Separate LOT plus explicit owner approval is required for tariff/checksum changes. Branch protection and required owner review remain an external governance prerequisite; no GitHub settings were changed.

## Price comparison and limits

See PRICING-V3-03-EXAMPLES.json, calculated using the exact production engine and integrated engine on identical inputs. The old engine had no page selector and ignored pages, so its 400 EUR output for pages=3/5 is not an old approved package price.

Examples: simple website 400 -> 390; one page + SEO + partial content 750 -> 390; 3 pages + Standard + partial + SEO 1000 -> 590; website content from scratch 700 -> 690. Unchanged: SEO + partial 450, automation + partial 700, rapid repair 300, included chatbot 800, MVP from scratch 1100 EUR.

Remaining review reservations: inherited lint failures; npm ci reports 13 existing dependency vulnerabilities (5 moderate, 7 high, 1 critical) under the unchanged production lockfile; bundle-size warning; browser coverage is Chromium on desktop/mobile viewports, not physical devices or Safari/Firefox. Email delivery and production persistence are intentionally not exercised. No commit or publication until separate owner approval.
