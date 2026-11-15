# DL-PRIVACY-CONSENT-01 — consent-first GA4 and Microsoft Clarity

Base: origin/main = 9d153db5b2468d91067a87027452e7399da38ba5 (Merge PR #8), fetched and verified.
Branch: feat/dl-privacy-consent-01, in a new isolated worktree. Independent of PR #9 (feat/dl-growth-tracking-01, open, blocked).
Status: local implementation and tests only. No commit, push, deployment, GA4/Clarity dashboard, credential or database change.

## Phase 1 audit (state on main before this LOT)

| Area | Finding |
| --- | --- |
| GA4 | `src/utils/analytics.js`, measurement ID `G-DPEYZ4C8BD`. `initializeGoogleAnalytics()` was called unconditionally in `main.jsx`. It loaded gtag.js (which sets `_ga`/`_ga_*` cookies) on every page of an allowed production host, before any choice by the visitor. Config: `send_page_view: false`; a manual `page_view` on each route change; no Consent Mode; Google signals left at the property default. |
| Custom events | `estimator_quote_request`, `estimator_quote_submit`, `social_media_request_submit`, `social_media_offer_select`, 7 `audit_*` events, all through `trackEvent()`. None carries free text. The repair suite stubbed gtag and checked that the URL and description never appear. |
| Clarity | `src/utils/clarity.js`, project `xv376wrguc`. It was loaded unconditionally at startup on allowed hosts, with no consent signal and no masking in code. Recording therefore covered every page, including the client area and admin (messages, documents, quotes), protected only by the Clarity dashboard's masking setting. Its default, "Balanced", masks inputs, numbers and e-mails but not other text; the actual setting was not verified. |
| Consent | None: no banner, no Consent Mode, no stored choice, no withdrawal. |
| Storage | The site itself uses no `localStorage`, `sessionStorage` or `document.cookie`. Supabase auth keeps its session in `localStorage` only after a sign-in (strictly necessary). |
| Hostname guard | `isTrackingAllowed()`: a production build on `digitallab.studio` or `www.digitallab.studio` only. Localhost, LAN, Vercel Preview, look-alikes and the prerender (which also blocks vendor hosts) never load the vendors. Unchanged and still tested. |
| Blocked tracking | When gtag.js is blocked (ad blocker), the stub still queues into `dataLayer` and nothing is sent. When Clarity is blocked, its queue stays local. No errors either way (browser-tested). |
| Privacy policy | French only (`/politique-de-confidentialite`); the English footer links to it. It said the site "uses Google Analytics", unconditionally, and did not mention Microsoft Clarity, consent or withdrawal. |
| Repair promise | "These fields … are not sent to analytics tools." True for GA4 events, but Clarity recordings could capture typed or displayed text depending on its masking mode. |

## Consent contract

| Category | Vendor | Default | Loads when |
| --- | --- | --- | --- |
| Necessary | the stored choice (`localStorage["dl-consent"]`), Supabase session after sign-in | always | — |
| `analytics` | Google Analytics 4 | **off** | the visitor opted into "Mesure d’audience" **and** `isTrackingAllowed()` |
| `recording` | Microsoft Clarity | **off** | the visitor opted into "Enregistrement de session" **and** `isTrackingAllowed()` |

- **Stored record:** `{"version":1,"analytics":bool,"recording":bool,"date":"YYYY-MM-DD"}`.
  - The day-precision date only serves expiry. There is no identifier, and the record is never sent.
  - A record that is absent, malformed, tampered with, from another `CONSENT_POLICY_VERSION`, dated in the future or **older than 6 months** counts as *no choice*: nothing optional loads, the record is removed and the banner is shown again.
  - Bump `CONSENT_POLICY_VERSION` (src/utils/consent.js) whenever vendors or purposes change.
- **Prior consent:**
  - Without a valid opt-in, gtag.js and Clarity are never requested. `window.gtag` and `window.clarity` stay undefined, and `trackEvent()` and `trackPageView()` are no-ops: they now also check an internal "enabled" flag, not just the presence of `window.gtag`.
  - No page view is sent before consent.
  - Leftover `_ga*`, `_gid`, `_gat*`, `_clck` and `_clsk` cookies from earlier, un-consented visits are deleted at startup.
- **When consent is given during a visit:** the vendor loads once. For GA4, the page being viewed at that moment is recorded once. Earlier pages and interactions are never replayed.
- **GA4 configuration with consent:** Consent Mode defaults to `analytics_storage: granted` and `ad_storage`, `ad_user_data` and `ad_personalization: denied`; `allow_google_signals: false`; `allow_ad_personalization_signals: false`. The event names and parameters are unchanged.
- **Clarity with consent:**
  - `clarity('consentv2', { ad_Storage: "denied", analytics_Storage: "granted" })`.
  - **All page content is masked in code** with `<body data-clarity-mask="true">`, set both in `index.html` and at load time. According to Microsoft's documentation, this attribute overrides the dashboard masking setting. Recordings keep the layout, clicks and scrolling, but no page text and no typed values.
  - Clarity must never be loaded without consent: Microsoft documents that with consent "denied" it still records in a cookieless "no-consent mode".
- **Withdrawal or change:** through the footer button "Gérer les cookies / Cookie settings", present on every public page.
  - **GA4 stops in place, no reload:**
    - Google's official opt-out flag `window["ga-disable-G-DPEYZ4C8BD"] = true` is set;
    - Consent Mode is updated to `analytics_storage: denied`;
    - our helpers stop sending, and the `_ga*` cookies are deleted on the host and parent domains;
    - re-consent on the same page lifts the flag.
  - **Clarity reloads the page:**
    - Clarity has no documented stop call, so the site sends `consentv2` (denied) and `consent(false)` (Microsoft's documented cookie erase), and deletes `_clck` and `_clsk`;
    - it then reloads the page, which comes back without Clarity;
    - the dialog says so beforehand.
  - Third-party cookies set on the vendors' own domains (for example on clarity.ms) cannot be deleted by the site.
- **Where the UI shows:**
  - On the production domains.
  - On Vercel Previews, for review only. There `isTrackingAllowed()` still blocks every vendor, so choices change nothing.
  - Never on localhost, in development or in the build-time prerender. The existing UI suites therefore run unchanged, and the static HTML contains no banner.

## UI

- **Banner** (`src/components/ConsentManager.jsx`, rendered next to `<App />` in `main.jsx` so it is first in keyboard order):
  - a region labelled by its heading, with FR/EN text following `<html lang>`;
  - three buttons with **identical style and size**: Tout refuser / Personnaliser / Accepter tout (Reject all / Customize / Accept all);
  - a link to the privacy policy (EN: "Privacy policy (in French)");
  - the site stays usable without choosing: no wall, and no choice counts as refusal.
- **Preferences dialog** (native `<dialog>`, modal, focus moves inside, Escape closes without saving):
  - a "Nécessaires" group, always active;
  - two unchecked-by-default checkboxes, "Autoriser Google Analytics" and "Autoriser Microsoft Clarity", each with its purpose, data and cookies described;
  - Tout refuser / Enregistrer mes choix / Accepter tout, with the same style;
  - a "Fermer sans changer" button.
- **Footer:** a "Gérer les cookies" button in the legal links, which reopens the dialog pre-filled with the current choice. Saving announces "Vos choix ont été enregistrés." through a polite live region.
- **Layout:**
  - fixed at the bottom, at most 920 px wide, with 16 px gutters (8 px at 560 px and below);
  - stacked full-width buttons on phones, all at least 44 px tall;
  - no horizontal overflow at 320, 390 or 1440 px.

## Privacy notice

**Applied to the French page:**
- Section 2 no longer says that Google Analytics is used unconditionally.
- New section "3. Cookies, mesure d’audience et enregistrement de session" (`#cookies`) covers:
  - the optional, off-by-default nature of both tools;
  - per tool: purpose, data categories and cookies;
  - Google signals and ad personalization disabled;
  - Clarity content masking;
  - typed data excluded from GA4 measurements and masked in Clarity (the Clarity part is pending verification on a real recording);
  - necessary storage, including the 6-month choice renewal;
  - withdrawal through "Gérer les cookies", including the Clarity reload;
  - links to the Google and Microsoft privacy policies.
- The following sections are renumbered 4–11.

No retention period, transfer mechanism or legal basis was invented.

**English draft** (there is no English policy page; to publish if the owner wants one):

> **Cookies, audience measurement and session recording.** These tools are optional and off by default. They load only after you consent, category by category, in the "Your cookie choices" banner. Without consent, or if you refuse, none of them loads and the site works normally.
> - Audience measurement — Google Analytics (Google): pages viewed, visit source, device and browser type, approximate location, and use of the price estimator (services and packages chosen, never typed text). Cookies: `_ga`, `_ga_…`. Google signals and ad personalization are disabled.
> - Session recording — Microsoft Clarity (Microsoft): clicks, scrolling and movements on pages, device and browser type. Page content and typed fields are masked in the site's code. Cookies: `_clck`, `_clsk`.
>
> Website addresses, problem descriptions, e-mail addresses, names and messages you type are not included in the measurements sent to Google Analytics and are masked in Microsoft Clarity. Necessary storage, without consent: remembering your choice on your device (local storage `dl-consent`, renewed at least every 6 months) and, if you sign in, your client-area session. You can change or withdraw your consent at any time with "Cookie settings" at the bottom of the page; withdrawal stops the tool and deletes its cookies on this site, and withdrawing Microsoft Clarity reloads the page. These providers process data under their own policies: Google (policies.google.com/privacy) and Microsoft (privacy.microsoft.com/privacystatement).

## Points needing human or legal review (not decided here)

1. **Retention periods:** GA4 (the property's data-retention setting) and Clarity were not stated, because the configured values are unknown. Add the real values.
2. **International transfers:** Google and Microsoft may process data outside the EU. The transfer mechanism (for example the EU-US Data Privacy Framework) and the processor or joint-controller roles were not stated.
3. **Legal basis wording, and the right to lodge a complaint with the CNIL.** The latter is not mentioned anywhere in the current policy; this is a pre-existing gap.
4. **Policy date:** "Dernière mise à jour : 1er septembre 2026" was left unchanged. Update it on the day the new text is published.
5. **English policy page:** whether to publish one (draft above), or keep the English link to the French page.
6. **Is Clarity still worth it with full masking?** The owner can unmask selected static marketing sections with `data-clarity-unmask="true"`. Never unmask the estimator, repair fields, quote panels, the client area or admin.
7. **Clarity dashboard (owner action, not verified):** set masking to **Strict**, and check the project's cookie-consent setting. The code-level mask overrides the dashboard according to Microsoft, but **no recording has been inspected**. After deployment, open a test recording and confirm that the text and the repair fields are masked.
8. **GA4 dashboard (owner action):** check that Google signals and ads links are off at the property level; the code already disables them per hit.
9. **6-month choice lifetime:** this follows CNIL's recommendation; confirm it.

## Integration safety

- Unchanged: prices, package and billing rules, locks, the estimator, website, repair, Social Media, Reels, `quoteMailto` and the copy fallback; event names and parameters; `trackingEnvironment.js`; the prerender block list; `api/` and `supabase/`.
- `scripts/check-repair-ui.mjs`: one assertion changed. On localhost it used to expect a stubbed `gtag` to receive `estimator_quote_request`. Since nothing may be sent without consent, it now asserts that the stub receives **no** call. Its privacy checks are unchanged. The check that GA4 never receives the repair URL or description *with consent* moved to `check-consent-ui.mjs`, which runs it on the real production path.
- Behaviour change to expect: GA4 and Clarity volumes will drop to the visitors who consent. Leftover `_ga` and `_clck` cookies of returning visitors are deleted on their first visit after deployment.

## Files

- Added:
  - `src/utils/consent.js`
  - `src/utils/consent.test.js`
  - `src/utils/trackingConsent.js`
  - `src/components/ConsentManager.jsx`
  - `src/components/ConsentManager.css`
  - `scripts/check-consent-ui.mjs`
  - `docs/DL-PRIVACY-CONSENT-01.md`
- Modified:
  - `src/main.jsx`: no unconditional vendor loading; consent startup and `<ConsentManager>`.
  - `src/utils/analytics.js`: load only on call; enabled flag; Consent Mode and no signals; `disableGoogleAnalytics`.
  - `src/utils/clarity.js`: consentv2, body mask, `withdrawMicrosoftClarity`.
  - `src/App.jsx`: footer "Gérer les cookies" button; privacy policy section 3, the section 2 paragraph and renumbering.
  - `index.html`: `<body data-clarity-mask="true">`.
  - `scripts/check-repair-ui.mjs`: the assertion above.
  - `package.json`: `consent.test.js` in `npm test`; `check:consent:ui`; the suite appended to `check:pricing:ui`, which CI runs.

## Tests

- `consent.test.js` (7 tests):
  - only valid records count; absent, malformed, outdated, tampered and future records do not;
  - 6-month expiry;
  - the minimal serialized record;
  - UI hosts: production and Vercel Preview yes, localhost and development no;
  - cookie deletion on the host and parent domains only, for matching names only;
  - no-op outside a browser.
- `check-consent-ui.mjs` runs against the built site, with the production and Preview hostnames mapped to the local server and every external request aborted and recorded:
  - **No choice** (FR/EN × 1440, and 390 mobile with touch, plus 320): zero GA4 and Clarity requests and globals; leftover vendor cookies deleted; estimator use changes nothing; reject, customize and accept identical in style and height; at least 44 px targets; banner inside the viewport; no overflow.
  - **Refuse all:** persisted; nothing after a reload either.
  - **GA4 only,** keyboard-driven (Enter, Space; Escape closes without saving; nothing prechecked; focus inside the dialog):
    - gtag requested once;
    - Consent Mode defaults and the config without signals verified;
    - one `page_view` at consent, none replayed;
    - `estimator_quote_request` keeps its four parameters;
    - the repair URL, description and name never appear in any payload;
    - after a reload, loaded once with one `page_view`.
  - **Clarity only** (EN): Clarity requested once; queue = `consentv2` with ads denied; body masked; no GA4.
  - **Accept all:** each vendor loads once per page load (SPA navigation adds page views, not loads).
  - **Withdraw GA4 through the footer control** (keyboard): no reload, opt-out flag set, Consent Mode denied, `_ga` cookies deleted, no further event.
  - **Withdraw Clarity:** the page reloads without Clarity, its cookies are erased, and nothing more is requested. Re-consent works.
  - **Invalid, outdated, expired and tampered records** count as no consent and are removed.
  - **Vercel Preview:** banner shown, but "accept all" loads nothing. **Localhost:** no banner and no footer button.
  - **Privacy policy:** documents both tools and withdrawal.
  - No other third-party host was requested on any tested page.
- Screenshots (ignored, not committed): `consent-review.local/`:
  - `FR/EN-1440-banner`, `FR/EN-390-banner`, `FR-320-banner`;
  - `FR-320-preferences`, `FR-1440-preferences`;
  - `FR-privacy-cookies-section`.

## Recommended release order relative to PR #9

1. Review and approve this LOT, including the human or legal review points above, then merge and deploy it.
2. After deployment, in a real production browser:
   - check that nothing loads before consent;
   - give consent and check GA4 Realtime and a Clarity test recording (masking);
   - withdraw consent.
3. Rebase PR #9 (estimator tracking) onto the new `main`.
   - Its `check-tracking-ui.mjs` reads GA4 events on the production host. It must seed a granted `dl-consent` record, or click "Accepter tout", before asserting events: without consent no event is sent, by design.
   - Expect a small conflict in `package.json` scripts.
   - Then lift its production block.
4. Register the GA4 custom dimensions for PR #9 before that deployment.
