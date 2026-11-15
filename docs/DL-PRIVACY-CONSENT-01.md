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

> [!WARNING]
> **Pre-release item:** the policy still shows "Dernière mise à jour : 1er septembre 2026". It is left unchanged on purpose. Set it to the actual publication day just before production deployment; the new disclosures must not go live under the old date.

**Applied to the French page (`/politique-de-confidentialite`):**
- Section 2 no longer says that Google Analytics is used unconditionally.
- Section 3 "Cookies, mesure d’audience et enregistrement de session" (`#cookies`) covers:
  - optional, off by default; per tool: purpose, data categories, cookies;
  - Google signals and ad personalization disabled; Clarity content masked in code;
  - typed data excluded from GA4 measurements and masked in Clarity (Clarity part pending a real-recording check);
  - necessary storage, including the 6-month choice renewal;
  - **legal basis:** consent (art. 82 loi Informatique et Libertés for cookies; GDPR art. 6.1.a); withdrawal is not retroactive (GDPR art. 7.3);
  - **provider roles and transfers, each attributed to the vendor's own statement ("Google indique", "Microsoft indique"), not asserted as Digital Lab's legal conclusion:** Google says it acts as processor for GA, relies on the DPF with SCCs as a fallback, and does not log IP addresses. Microsoft says it acts as controller for Clarity, hosts data on Azure, contracts through Microsoft Ireland Operations Limited, and covers transfers to Microsoft Corporation with SCCs;
  - **retention, separating vendor-stated values from account settings:**
    - vendor-stated default: `_ga` / `_ga_…` cookies 2 years ("selon Google… par défaut"; not overridden in code);
    - account setting: GA detailed data retention is a property setting, capped at 14 months for a standard (non-360) property; aggregated reports unaffected. The actual value (2 or 14 months) is not stated because it was not verified;
    - vendor-stated: Clarity recordings 30 days, and up to 9 months for favorites and a random sample ("selon Microsoft");
  - withdrawal through "Gérer les cookies", including the Clarity reload; vendor policy links.
- Section 9 "Droits RGPD" adds:
  - portability;
  - withdrawal of consent via "Gérer les cookies";
  - the one-month answer period (GDPR art. 12.3);
  - the **right to complain to the CNIL** (link to cnil.fr/fr/adresser-une-plainte).
- Preserved unchanged:
  - controller identity (section 1);
  - e-mail requests, the client area and former form requests (section 2);
  - the internal Google automation (Sheets, Drive), purposes, access limits, revocation and the Google API Limited Use disclosure (sections 4–8 and 11).

**Sources (consulted 15 November 2026):**
- CNIL, cookies: what the law says (information, withdrawal): https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi
- CNIL, cookies FAQ / consolidated recommendation. Keeping the choice 6 months is good practice. The 13- and 25-month limits apply only to audience tools exempt from consent: https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ
- CNIL, complaints: https://www.cnil.fr/fr/adresser-une-plainte
- Google, GA4 data retention (2 or 14 months; aggregated reports unaffected): https://support.google.com/analytics/answer/7667196
- Google, GA4 cookies (`_ga`, `_ga_<id>`: 2 years): https://support.google.com/analytics/answer/11397207
- Google, Analytics data privacy (processor role; IP addresses not logged or stored): https://support.google.com/analytics/answer/6004245
- Google, processor services list (Google Analytics listed): https://business.safety.google/adsservices/
- Google, data transfers (EU-US DPF; SCCs): https://business.safety.google/adsdatatransfers/
- Microsoft, Clarity FAQ (controller role; Azure; MIOL + SCCs; 30-day / 9-month retention): https://learn.microsoft.com/en-us/clarity/faq
- Microsoft, Clarity cookies (`_clck`, `_clsk`; no lifetimes stated): https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies

**Banner link.** The banner and the preferences dialog link to `/politique-de-confidentialite#cookies`, which exists in French only. The English label reads "Privacy policy, cookies section (in French)" and the link carries `hreflang="fr"`, so it describes the target accurately; the consent suite asserts the href, the `hreflang` and that the section lands below the sticky header. The footer's English "Privacy policy" link (outside this LOT's banner) still does not say the page is French.

**English copy.** No English policy page exists. If one is published, use this text:

> **Cookies, audience measurement and session recording.** These tools are optional and off by default. They load only after you consent, category by category, in the "Your cookie choices" banner. Without consent, or if you refuse, none of them loads and the site works normally.
> - Audience measurement — Google Analytics (Google): pages viewed, visit source, device and browser type, approximate location, and use of the price estimator (services and packages chosen, never typed text). Cookies: `_ga`, `_ga_…`. Google signals and ad personalization are disabled.
> - Session recording — Microsoft Clarity (Microsoft): clicks, scrolling and movements on pages, device and browser type. Page content and typed fields are masked in the site's code. Cookies: `_clck`, `_clsk`.
>
> Website addresses, problem descriptions, e-mail addresses, names and messages you type are not included in the measurements sent to Google Analytics and are masked in Microsoft Clarity. Necessary storage, without consent: remembering your choice on your device (local storage `dl-consent`, renewed at least every 6 months) and, if you sign in, your client-area session. You can change or withdraw your consent at any time with "Cookie settings" at the bottom of the page; withdrawal stops the tool and deletes its cookies on this site, and withdrawing Microsoft Clarity reloads the page.
>
> Legal basis: your consent (article 82 of the French Data Protection Act for cookies, article 6(1)(a) GDPR for the data). Withdrawing consent does not affect processing carried out before the withdrawal.
>
> Provider roles and transfers outside the European Union:
> - Google Analytics: Google states that it acts as a processor for Google Analytics. Google states that Google Analytics does not log or store IP addresses. Data may be processed in the United States; Google states that it relies on the EU-U.S. Data Privacy Framework and, where applicable, on the European Commission's standard contractual clauses.
> - Microsoft Clarity: Microsoft states that it acts as a data controller for Clarity. Data is hosted on Microsoft Azure; the contract is with Microsoft Ireland Operations Limited, and transfers to Microsoft Corporation (United States) are covered by standard contractual clauses.
>
> Retention: according to Google, the `_ga` and `_ga_…` cookies expire by default after 2 years; the retention period for detailed data is a Google Analytics account setting and cannot exceed 14 months (aggregated statistical reports are not subject to this limit). According to Microsoft, Clarity keeps recordings for 30 days, and up to 9 months for recordings marked as favorites and a random sample of recordings. These providers process data under their own policies: Google (policies.google.com/privacy) and Microsoft (privacy.microsoft.com/privacystatement).
>
> **Your rights.** Under the GDPR you may request access to, rectification, erasure or restriction of your data, and its portability. You may object to certain processing where the law allows, and withdraw your consent to optional cookies at any time with "Cookie settings" at the bottom of the page. To exercise your rights, contact Digital Lab by e-mail; you will receive an answer within one month. If you believe your rights are not respected, you may lodge a complaint with the CNIL: www.cnil.fr/fr/adresser-une-plainte.

## Points needing owner or legal confirmation (not decided here)

| # | Item | Who / when |
|---|------|------------|
| 1 | **GA4 property retention setting** (2 or 14 months). The page calls it an account setting capped at 14 months, which holds for a standard (non-360) property. Confirm the property is standard; once the value is checked, the page can state it. | Owner: Admin › Data retention |
| 2 | **`_ga` lifetime of 2 years** (Google default). CNIL's 13-month cap formally applies to consent-exempt tools, but a shorter lifetime (`cookie_expires`) is common good practice. Change the code only if the owner wants it. | Owner / legal |
| 3 | **Clarity role.** Microsoft's FAQ says Clarity "operates as a data controller". Whether Digital Lab is a joint controller for the collection is a legal assessment. | Legal review |
| 4 | **Clarity cookie lifetimes** (`_clck`, `_clsk`): Microsoft's cookie page doesn't state them, so they are not published. | Owner: devtools after consent, or omit |
| 5 | **Legal basis and retention periods for e-mail requests and the client area.** The basis is likely pre-contractual measures or contract (GDPR art. 6.1.b); section 7 is generic. Pre-existing gap. | Legal review |
| 6 | **Recipients and processors for hosting and the client area** (Vercel, Supabase, and Resend if quote e-mails are re-enabled) and their transfer mechanisms. The policy doesn't list them; Vercel appears only in the legal notice. Pre-existing gap. | Owner / legal |
| 7 | **Policy date (pre-release, blocking):** "Dernière mise à jour : 1er septembre 2026" is left unchanged on purpose. Set it to the real publication day just before deployment. | Owner, at release |
| 8 | **English policy page:** publish the English copy above as a page, or keep the deep link to the French section. | Owner |
| 9 | **Is Clarity still worth it with full masking?** Selected static marketing sections can be unmasked with `data-clarity-unmask="true"`. Never unmask the estimator, repair fields, quote panels, the client area or admin. | Owner |
| 10 | **Clarity dashboard:** set masking to **Strict** and inspect a synthetic test recording. Not verified yet. | Owner, before production |
| 11 | **GA4 dashboard:** check that Google signals and ads links are off at property level, and that the Data Processing Terms are accepted. | Owner, before production |
| 12 | **6-month choice lifetime:** the CNIL calls it good practice; confirm. | Owner |
| 13 | **Clarity on client-area and admin pages.** With consent, Clarity currently loads on every page, including `/login`, `/espace-client`, `/dashboard` and `/admin`, where client messages, documents and quotes are shown. Everything is masked in code, but masking is not yet verified on a real recording. **Recommendation:** exclude these routes from Clarity entirely (do not load it there, and stop it before an in-app navigation into them, which requires a reload because Clarity has no stop API). This needs a separate scoped implementation and tests; it is not part of this commit. | Owner decision, then a separate LOT, before production if possible |

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
