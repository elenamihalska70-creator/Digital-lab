# DL-GROWTH-TRACKING-01 — estimator usage events (GA4 contract)

Base: origin/main = 9d153db5b2468d91067a87027452e7399da38ba5 (Merge PR #8), fetched and verified.
Branch: feat/dl-growth-tracking-01, in a new isolated worktree.
Status: review PR only. **BLOCKED FOR PRODUCTION** until GA4/Clarity consent gating and the privacy notice review are complete (see "Consent and compliance"). No deployment, GA4 property or database change.

## Existing analytics (unchanged)

- `src/utils/analytics.js` loads gtag.js for `G-DPEYZ4C8BD` only when `isTrackingAllowed()` returns true:
  - a production build (`import.meta.env.PROD`);
  - served from `digitallab.studio` or `www.digitallab.studio`.
- Otherwise `window.gtag` is never defined and `trackEvent()` does nothing. That covers localhost, LAN, Vercel Preview, look-alike hosts and the build-time prerender.
- Microsoft Clarity (`xv376wrguc`) uses the same guard.
- `config` uses `send_page_view: false`. `page_view` is sent manually on each route change, deduplicated by path.

| Event | When it fires | Parameters | What it really means |
| --- | --- | --- | --- |
| `page_view` | each new path | page_title, page_location, page_path | page view |
| `audit_*` (7 events) | audit CTAs, nav, video | cta_location, destination_type | audit funnel clicks |
| `social_media_offer_select` | (a) plan/Reels/hero CTA on the Social Media page; (b) also on the estimator quote CTA when the request contains Social Media or Reels | offer, cta_location | two meanings, told apart by `cta_location` (`hero`, `pricing_card`, `reels_card` vs `estimator_home`, `estimator_social`) |
| `estimator_quote_request` | every click on "Demander ce devis / Request this quote" | offer, has_project, content_service, cta_location | **quote CTA intent only**. Fires before the e-mail is built, whether or not a mail app opens |
| `estimator_quote_submit` | the site attempts to open the mail app: automatically after the CTA when the summary fits in `mailto:`, and again on each click of "Ouvrir l’e-mail" in the summary panel | offer | **mail-app open attempt**. Not a sent e-mail and not a lead. It can fire more than once per request; with the copy fallback it fires only if the visitor clicks "Ouvrir l’e-mail, puis coller" |
| `social_media_request_submit` | same moments as `estimator_quote_submit`, when the request contains Social Media or Reels | offer | same as above. The legacy name says "submit", but nothing is submitted |

Nothing in this LOT renames or changes these events or their parameters (browser-tested: `estimator_quote_request` params and `estimator_quote_submit` are byte-identical). Renaming the two `*_submit` events would break continuity of existing reports. If clearer names are wanted later, the migration path is:
1. Add `estimator_mail_open` next to the old events.
2. Run both for one full reporting period.
3. Switch reports to the new event.
4. Remove the old ones.

**No GA4 event is a confirmed lead.** A mail app may not open, the visitor may not send the message, or the e-mail may not be delivered.

## New events

Implementation:
- `src/utils/estimatorTracking.js`: pure module, no React or DOM.
- `UnifiedEstimator` in `src/App.jsx`: one tracker per mounted estimator instance, held in `useState`, so it is stable across re-renders and StrictMode.
- A capture-phase listener on the estimator `<section>` reports trusted (`isTrusted`) clicks and changes whose target is a control (`button, input, select, textarea, summary, a[href]`).
- An effect after each commit hands the computed estimate to the tracker.
- Sending goes through the existing `trackEvent()`, so the production guard applies unchanged.

### `estimator_open`

- **Fires on:** the first intentional interaction with one estimator instance: a trusted click or change on a control inside it. Opening the details dialog or the repair "add details" summary counts.
- **Never fires on:** render, hydration, re-render, StrictMode double effects, the estimator becoming visible, scrolling, resizing, keyboard focus alone, or a preset applied from a CTA outside the estimator.
- **Frequency:** once per mounted instance. A mount is one page view. A client-side navigation away and back mounts a new instance with fresh estimator state, so it can count again, together with the new `page_view`.
- **Parameters:**
  - `estimator_variant`: `main` (home FR `/`, home EN `/en/`) or `social` (`/services/gestion-reseaux-sociaux`). Existing events call `main` `estimator_home` in `cta_location`.
  - `page_language`: `fr` or `en`.

### `estimator_price_view`

**Definition.** An intentional interaction changed the priced configuration on screen, and this instance has not counted that configuration before.

- **Priced configuration:** the set of priced services computed by the estimate, each with its package or offer, billing type and computed amounts.
  - The amounts are compared locally but never sent.
  - A website surcharge (content from scratch, urgency, extra features) is therefore a new configuration of the same `website_*` package.
- **Deduplication:** per instance, each distinct configuration is counted at most once. Repeated clicks on the selected option, going back and forth, and re-selecting an already counted combination add nothing.
- **Passive configurations:** the configuration shown on load, or applied by an external preset, is displayed without being counted. Explicitly returning to it later counts once, for example SEO → back to "Créer un site web" at the default 390 €.
- **Not a price view:**
  - choices that leave every price unchanged: profile, priority, existing site; generic answers for package services; repair URL/description typing; the details dialog;
  - removing a service: nothing new is priced;
  - the quote CTA.
- **What is reported:** the service that changed or was added. When a single action changes several services, the first one in the order project → Social Media → Reels.

| Parameter | Values |
| --- | --- |
| `estimator_variant` | `main`, `social` |
| `page_language` | `fr`, `en` |
| `service_category` | `website`, `repair`, `seo`, `automation`, `chatbot`, `prototype`, `social_media`, `reels` |
| `package_id` | `website_1_page`, `website_3_pages`, `website_5_pages`; `repair_small`, `repair_comprehensive`, `repair_technical`, `repair_urgent`; `seo_essential`, `seo_visibility`, `seo_development`; `automation_essential`, `automation_business`, `automation_advanced`; `chatbot_essential`, `chatbot_business`, `chatbot_advanced`; `prototype_discovery`, `prototype_functional`, `prototype_mvp`; `social_presence`, `social_visibilite`, `social_croissance`; `reels_1`, `reels_4`, `reels_8`, `reels_complex` |
| `billing_type` | `fixed` (V4 fixed packages, single Reel), `from` (website, repair 70/650, SEO/automation "dès"), `quote`, `monthly` (Social Media, Reels packs) |
| `currency` | `EUR` |

The `social_*` and `reels_*` identifiers are the same as the existing `social_media_offer_select` offers.

**No amount is sent.** The package ID and billing type already identify the offer. Website and Social Media totals depend on options, and sending them as `value` would make GA4 present quote estimates as monetary event value or revenue. They would also drift whenever prices change. The `currency` parameter is included as specified; without `value` it has no monetary effect.

### Privacy and GA4 limits

Payloads contain only the enumerated values above:
- no free text, URL, e-mail, name, answer label or amount;
- no client, user, session or instance identifier, and no timestamp, cookie, storage or fingerprint.

GA4 counts users itself. Two separate browser contexts doing the same journey produce identical payloads (browser-tested). Unknown inputs fall back to safe values or are dropped.

GA4 rules (unit-tested): event names are at most 40 characters of letters, digits and underscores, starting with a letter, with no reserved prefix (`google_`, `ga_`, `firebase_`) or reserved name. Each event has at most 25 parameters; parameter names are at most 40 characters and values at most 100.

## Consent and compliance (flagged, not changed)

**Risk to review.** The site has no consent banner and no Consent Mode:
- gtag.js (with its `_ga` cookies) and Clarity load on every production page view, before any choice by the visitor;
- the privacy policy describes Google Analytics and its cookies but offers no opt-in or opt-out.

Under the French CNIL rules, GA4 does not qualify for the audience-measurement consent exemption. Session-recording tools such as Clarity also need consent. This LOT adds no cookie, storage or identifier and keeps the same guard. However, the new events send more interaction data through the same un-consented GA4 setup.

Recommendation, as a separate LOT: add a consent mechanism, for example GA4 Consent Mode v2 with default `denied` and a CNIL-compliant banner. Gate both GA4 and Clarity on it, and update the privacy policy, which currently does not mention Clarity.

**Also to verify (owner, in the Clarity dashboard).** The repair privacy notice says the URL and description fields "are not sent to analytics tools". GA4 events never contain them (tested), but Clarity session recordings may capture typed text depending on its masking mode. Check that Clarity masking is "Strict", or that these fields are masked.

## Proposed GA4 dashboard (Explorations)

1. **Estimator users:** Users with event `estimator_open`, broken down by `estimator_variant` and `page_language`.
2. **Meaningful price views:** event count of `estimator_price_view`, plus the average per estimator user.
3. **Service popularity:** `estimator_price_view` by `service_category`.
4. **Package interest:** `estimator_price_view` by `package_id`, then `billing_type`.
5. **Quote CTA intent:** event count and users of `estimator_quote_request`, by `cta_location` and `offer`. Funnel exploration: `estimator_open` → `estimator_price_view` → `estimator_quote_request`.
6. **Mail-app open attempts:** `estimator_quote_submit`, shown separately and labelled "attempts".
7. **Confirmed inbound leads:** outside GA4. Count received e-mails with the subject "Demande de devis Digital Lab" / "Digital Lab quote request" in the business inbox, for example in a monthly sheet with date, service and language. Do not import them as GA4 conversions without real delivery evidence.

### GA4 settings needed (owner action, not done here)

- Register event-scoped custom dimensions **before deployment**. GA4 custom dimensions are not retroactive, and values sent before registration never appear in reports.
  - New: `estimator_variant`, `page_language`, `service_category`, `package_id`, `billing_type`.
  - Optional, to read existing events: `offer`, `cta_location`, `content_service`.
  - The standard property limit is 50 event-scoped dimensions.
- Optionally mark `estimator_quote_request` as a key event, named "quote intent", not "lead".
- **Data starts only after this change is deployed to production.** There is no retroactive price-view data.
  - Preview and localhost send nothing, so validation happens in production (GA4 Realtime or DebugView with the GA debugger extension).
  - Low daily volumes may be hidden by GA4 data thresholds or sampling in explorations.

## Known limitations

- `estimator_open` and `estimator_price_view` measure interactions. They do not show that the visitor read the price or reached a decision.
- Ad blockers, browser tracking protection and blocked gtag.js prevent events, so counts are a lower bound.
- A client-side navigation away and back starts a new instance, which may count again.
- Two tabs are two instances.
- E-mail: `estimator_quote_submit` and `social_media_request_submit` record attempts to open a mail app, never delivery. Leads must be counted from received e-mails.
- Mail-app behaviour on physical iOS/Android devices was not tested (Chromium emulation only).
- Consent: see above. The legal assessment is the owner's.
- `reelsAnalyticsKey` in App.jsx and the Reels identifiers in `estimatorTracking.js` are intentionally identical. The unit test pins the module's identifiers. App.jsx was left untouched to keep its existing contract.

## Files

- Added:
  - `src/utils/estimatorTracking.js`
  - `src/utils/estimatorTracking.test.js`
  - `scripts/check-tracking-ui.mjs`
  - `docs/DL-GROWTH-TRACKING-01.md`
- Modified:
  - `src/App.jsx`: one import, the tracker and its effect, and the capture handlers on the estimator section.
  - `src/utils/trackingEnvironment.test.js`: real Preview hostname pattern; `trackEvent` no-op without the guard.
  - `package.json`: the new unit test in `npm test`; `check:tracking:ui`; the new suite appended to `check:pricing:ui`, which CI already runs.
- Unchanged: `analytics.js`, `trackingEnvironment.js`, `clarity.js`, prices, the locks, `quoteMailto.js`, legal pages, `api/`, `supabase/`.

## Tests

- **`npm test`:** includes 10 tracking contract tests and 2 new guard tests. They cover:
  - no event on mount, re-render or StrictMode;
  - open fires once;
  - cosmetic changes are ignored;
  - one event per package change and none on repeated clicks;
  - per-instance deduplication and the passive initial configuration;
  - a surcharge counts while a removal does not;
  - presets are passive;
  - all 26 identifiers;
  - GA4 naming and limits, no private values, no identifiers;
  - safe fallbacks.

  Mutation-checked: removing deduplication, the preset rule or the interaction gate makes them fail.
- **`check-tracking-ui.mjs`** runs against the built site. The production and Vercel Preview hostnames are mapped to the local server, and every external request is aborted.
  - **Guard:** on 127.0.0.1 and the Preview host, gtag is absent, there is no dataLayer and no analytics request, even after interactions.
  - **Production host, FR/EN × 1440 desktop / 390 mobile with touch:**
    - nothing on load, scroll, wheel, resize or keyboard focus;
    - the details dialog sends `estimator_open` only;
    - re-selecting the selected service and cosmetic answers send nothing;
    - SEO package changes, including keyboard Space, send one event each, and repeated clicks send none;
    - deduplicated returns; a website surcharge; Social added; removal ignored;
    - `estimator_quote_request` and `estimator_quote_submit` keep the same parameters, with open still counted once;
    - payloads are identical across visitors;
    - no cookie, no writes, no errors.
  - **Repair:** the private URL and description never reach GA4.
  - **Social Media page:** CTA presets are passive (only the existing `social_media_offer_select`); estimator choices report variant `social`.
