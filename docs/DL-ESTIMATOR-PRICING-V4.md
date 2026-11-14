# DL-ESTIMATOR-PRICING-V4 — four service packages (local review)

Base: origin/main = d515c2984d83e147f9913fcaf612147a9d19ac8c (Merge PR #7), fetched and verified.
Branch: feat/dl-estimator-pricing-v4, in a new isolated worktree.
Status: local implementation and tests only, including the owner's final scoped revision. No commit, push, merge, deployment, database or external-account change.

## Architecture

- `src/utils/servicePackages.js` is the single auditable source for the four services: 12 packages with price, billing type (fixed / from / quote), FR/EN names, deliverables, limits, category exclusions and **internal** workload targets. The table is deep-frozen.
- Workload hours are internal profitability data only: they stay in the configuration, are not returned in an estimate, and are never displayed or e-mailed.
- `getCatalogEstimate()` wraps the existing `getDiagnosticEstimate()` the same way repair does. For SEO, automation, chatbot and prototype it replaces only `project` with `getServicePackageEstimate(need, packageId)`. Those two inputs are the only ones; generic answers (complexity, content, features, urgency, profile, priority, existing site) never reach a package price, and the locked V3 engine is not called for these services.
- Every other service passes straight through: website, repair, Social Media, Reels, one-time fees and first month are produced by the unchanged engine (deep-equality tested).
- `docs/pricing-v4-packages-lock.json` pins a SHA-256 of the package config. `check:pricing` (part of `check:release`) verifies the unchanged V3 lock and then the V4 lock. As with V3, the checksum detects accidental drift and is not owner authorization.

## Approved package matrix (automated evidence)

| Service | Package (FR / EN) | Price | Billing | Internal workload (not public) |
| --- | --- | --- | --- | --- |
| SEO & visibilité | SEO Essentiel / SEO Essential | 190 € | fixed scope | up to 3 h |
| | SEO Visibilité / SEO Visibility | 390 € | fixed scope | up to 7 h |
| | SEO Développement / SEO Development | dès 700 € | confirmed after diagnosis | approx. 12 h |
| Automatisation | Automatisation Essentielle / Essential Automation | 190 € | fixed scope | up to 3 h |
| | Automatisation Business / Business Automation | 490 € | fixed scope | up to 8 h |
| | Automatisation Avancée / Advanced Automation | dès 950 € | confirmed after assessment | approx. 15 h |
| Chatbot IA | Chatbot Essentiel / Essential Chatbot | 390 € | fixed scope | 5–6 h |
| | Chatbot Business / Business Chatbot | 790 € | fixed scope | 10–12 h |
| | Chatbot Avancé / Advanced Chatbot | sur devis | personalized quote | — |
| Prototype / MVP | Prototype Découverte / Discovery Prototype | 490 € | fixed scope | 6–7 h |
| | Prototype Fonctionnel / Functional Prototype | 990 € | fixed scope | 14–16 h |
| | MVP sur mesure / Custom MVP | sur devis | personalized quote | — |

Evidence: `src/utils/servicePackages.test.js` pins this matrix with independent literals and sweeps all 12 packages across every complexity × content × urgency value and 4 feature sets (1,296 combinations) with no price change. It asserts that a 190 € SEO or automation package is never 440 €, 560 € or the generic-engine amount, and that no recurring, one-time or first-month amount is added. `scripts/check-packages-ui.mjs` repeats this in the browser after deliberately setting "from scratch" content, Urgent and Payments on the website.

## Estimator UX

- Selecting one of the four services shows a "Forfait / Package" group of three choices with name and price ("190 €", "dès 700 €", "sur devis"). It is followed by the selected package's deliverables, limits and a "beyond this package = personalized quote" note. No hours are shown.
- Hidden for these services: complexity, content, features and urgency (each carried generic surcharges). Kept as optional context, without price effect: profile, priority, existing site.
- The live/sticky compact card shows the package name, price and billing type. The details dialog adds "Délai : Confirmé après analyse du projet" / "Timing: Confirmed after assessing the project" (no promised deadline), deliverables, limits, category exclusions, the general no-automatic-extras/no-recurring term, the tax note and the existing indicative-estimate note.
- The quote e-mail contains: package, price and billing type; every deliverable; limits; timing after assessment; context answers; category exclusions; the tax note.
  - Every package's complete e-mail opens in the mail app: the real percent-encoded `mailto:` URI is at most 1,867 of 1,900 characters (FR Chatbot Business with the longest-encoded context labels).
  - The text the mail app receives is byte-identical to the copyable summary, including accents, typographic apostrophes, € and non-breaking spaces.
  - Combined with a fully optioned Social Media plan, the existing copy/paste fallback applies: the mail app is not opened with truncated text, and the complete summary is copied.
- One remembered package per service; switching services keeps each choice and leaves the website's stored answers intact.

## Files

Added: src/utils/servicePackages.js, src/utils/servicePackages.test.js, docs/pricing-v4-packages-lock.json, scripts/check-packages-ui.mjs, docs/DL-ESTIMATOR-PRICING-V4.md.

Modified:
- src/App.jsx: package questions, result card, dialog and quote summary.
- src/App.css: scoped package rules.
- scripts/pricing-lock.mjs: optional `paths` argument and LOCKED_PACKAGE_PATHS; the V3 default is unchanged.
- scripts/pricing-lock.test.mjs: V4 lock test.
- scripts/check-pricing.mjs: verifies V3, then V4.
- package.json: scripts only.
- scripts/check-pricing-ui.mjs and scripts/check-repair-ui.mjs: see below.

Unchanged, verified byte-identical to the base: src/utils/estimator.js, websitePricing.js, repairDiagnostic.js, quoteMailto.js, estimatorAnswers.js, src/config/taxMention.js, scripts/check-release.mjs, docs/pricing-v3-lock.json, package-lock.json, api/, supabase/, legal pages.

### Existing assertions replaced, not weakened

Two existing browser checks asserted the generic behaviour this LOT intentionally replaces:

- `check-pricing-ui.mjs`: automation used to show the complexity selector and a paid SEO checkbox that raised its price. It now asserts the opposite:
  - no complexity, content, features or urgency group;
  - three packages, and 190 € → 490 € on selection;
  - summary "Forfait : Automatisation Business" and no "Complexité";
  - choice restored after switching.

  Every website, Social Media, Reels, mailto and fallback assertion is unchanged.
- `check-repair-ui.mjs`: after leaving repair, the four services used to show the complexity group. They now must show 0 complexity groups and a 3-button package group. The repair privacy and leakage checks are unchanged.

## Validation

- npm test: 107/107 PASS (96 existing + 10 V4 contract + 1 V4 lock).
- npm run check:release: PASS (tax mention, V3 lock, V4 lock).
- npm run build: PASS, 14 prerendered routes.
- npm run check:pricing:ui: PASS (pricing FR/EN 1440/390, repair FR/EN 1440/390/320, V4 packages).
- node scripts/check-packages-ui.mjs: PASS, FR/EN at 1440×900, 390×844 and 320×740 (mobile emulation with touch) and 1686×896. Per run:
  - prices: all 12 packages; keyboard (Space) selection; compact price = dialog price; context answers never move the price;
  - content: deliverables, limits and terms; no hours in the card, compact summary, dialog or e-mail; timing after assessment;
  - e-mail: 12 complete encoded mailto e-mails, each with package, price and deliverables, body equal to the summary; copy fallback with the complete text;
  - unchanged behaviour: Social Media first month; desktop sticky price and CTA in view; website price restored;
  - hygiene: 0 writes, 0 page errors, no horizontal overflow.
- node scripts/check-sticky-ui.mjs: PASS, 288 combinations. node scripts/check-sticky-real-ui.mjs: PASS, 126 measurements. node scripts/check-header-ui.mjs: PASS.
- ESLint: findings identical to the baseline App.jsx; none in new or changed code.
- git diff --check: PASS.

Screenshots (ignored, not committed): pricing-v4-review.local/
- {FR,EN}-{1440,390,320,1686}-{seo,automation,chatbot,prototype}.png
- the -{seo,chatbot}-details.png views
- EN-390-fallback.png
- results.json

## Owner decisions and remaining risks

1. Package names: approved by the owner. "SEO Essential" (SEO keyword first) is kept; the other services use "<Tier> <Service>". French capitalization normalized to "MVP sur mesure".
2. Newly authored V4 English text uses American spelling (personalized, optimization, prioritized, customization), per owner decision. Pre-existing approved repair texts ("personalised quote") and unrelated content are intentionally unchanged.
3. Workload hours are internal only (removed from the UI and e-mails, kept in the config and checked by tests).
4. No delivery deadline is promised; timing is "confirmed after assessing the project".
5. CGV consistency to review by the owner (not edited; no legal page changed in this LOT): chatbot exclusions, the AI-uncertainty statement, the third-party subscription/API/hosting cost separation and "devis personnalisé" for anything outside a package should be checked against the CGV wording on liability, deliverables, deadlines and third-party costs.
6. VAT wording unchanged (FRANCHISE, art. 293 B du CGI).
7. Mailto margin: the longest complete package e-mail is 1,867 / 1,900 encoded characters. Lengthening a deliverable or exclusion may push it over the limit. The unit test then fails before release (25-character safety margin). The site itself would degrade to the copy fallback, losing nothing.
8. Not tested: real mail clients on physical iOS/Android devices (mailto handling is emulated, not executed), screen readers, real authenticated sessions, branch protection. Existing dependency-audit and large-bundle warnings are unchanged.
9. The legacy generic values for these four needs remain inside the locked estimator.js (still covered by its compatibility digest) but are no longer reachable from the UI.

## Proposed PR description

**feat(estimator): explicit V4 packages for SEO, automation, chatbot and prototype**

Replaces the generic complexity pricing for four one-off services with 12 owner-approved packages: 190–990 €, "dès 700/950 €" and "sur devis". They are defined in one frozen, checksum-locked config (`src/utils/servicePackages.js`).

- Package price depends only on the selected package. Complexity, content, features and urgency are hidden for these services and can never add 250/120/300/650 € or urgency multipliers.
- The live sticky card, details dialog and quote e-mail show the package, billing type, deliverables, limits and exclusions in FR/EN. Timing is confirmed after assessment, so no deadline is promised. Internal workload hours are never shown.
- The complete quote e-mail fits the percent-encoded mailto limit for every package; longer combined requests keep the existing copy fallback.
- Website (390/590/890), repair (70/650/quote), Social Media, Reels, VAT, mailto and the V3 lock are byte-for-byte unchanged.
- Tests:
  - V4 price contract and a 1,296-combination stale-input sweep;
  - internal-workload and no-deadline contracts;
  - encoded mailto contract and the V4 checksum lock;
  - new FR/EN browser suite (1440/390/320/1686, mobile emulation) added to `check:pricing:ui`;
  - two legacy assertions on automation complexity updated to the new contract.

No database, auth, backend, legal-page or deployment changes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
