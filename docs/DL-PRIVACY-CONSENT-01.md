# DL-PRIVACY-CONSENT-01 — consent-first GA4; Microsoft Clarity disabled for this release

Base: origin/main = 9d153db5b2468d91067a87027452e7399da38ba5 (Merge PR #8), fetched and verified.
Branch: feat/dl-privacy-consent-01 (PR #10), in an isolated worktree. Independent of PR #9 (feat/dl-growth-tracking-01, open, blocked).
Status: review PR. No merge, deployment, GA4/Clarity dashboard, credential or database change.

> [!WARNING]
> **Pre-release items (blocking production):**
> 1. **Policy date.** The policy still shows "Dernière mise à jour : 1er septembre 2026", the date of the notice that predates this LOT. Set `PRIVACY_POLICY_LAST_UPDATED` (src/App.jsx) to the actual publication day just before the production deployment, then run `npm run check:privacy-date`. That check fails on the old date, on an invalid date and on a future date. It is not part of CI, since it must fail until publication.
> 2. **Microsoft Clarity is disabled** (owner decision, below). Production must not be expected to produce Clarity recordings after this release.

## Phase 1 audit (state on main before this LOT)

| Area | Finding |
| --- | --- |
| GA4 | `src/utils/analytics.js`, measurement ID `G-DPEYZ4C8BD`. `initializeGoogleAnalytics()` was called unconditionally in `main.jsx`. It loaded gtag.js (which sets `_ga`/`_ga_*` cookies) on every page of an allowed production host, before any choice by the visitor. Config: `send_page_view: false`; a manual `page_view` on each route change; no Consent Mode; Google signals left at the property default. |
| Custom events | `estimator_quote_request`, `estimator_quote_submit`, `social_media_request_submit`, `social_media_offer_select`, 7 `audit_*` events, all through `trackEvent()`. None carries free text. The repair suite stubbed gtag and checked that the URL and description never appear. |
| Clarity | `src/utils/clarity.js`, project `xv376wrguc`. It was loaded unconditionally at startup on allowed hosts, with no consent signal and no masking in code. Recording therefore covered every page, including the client area and admin (messages, documents, quotes), protected only by the Clarity dashboard's masking setting. Its default, "Balanced", masks inputs, numbers and e-mails but not other text; the actual setting was not verified. |
| Consent | None: no banner, no Consent Mode, no stored choice, no withdrawal. |
| Storage | The site itself uses no `localStorage`, `sessionStorage` or `document.cookie`. Supabase auth keeps its session in `localStorage` only after a sign-in (strictly necessary). |
| Sign-in return | supabase-js 2.108.2 uses the default **implicit** flow: Google sign-in (`redirectTo: origin`), password-reset and confirmation links return to `/#access_token=…&refresh_token=…`. `trackPageView()` sent `page_path` and `page_location` including the fragment, so with GA4 active the tokens could reach Google. |
| Hostname guard | `isTrackingAllowed()`: a production build on `digitallab.studio` or `www.digitallab.studio` only. Localhost, LAN, Vercel Preview, look-alikes and the prerender (which also blocks vendor hosts) never load the vendors. Unchanged and still tested. |
| Privacy policy | French only (`/politique-de-confidentialite`); the English footer linked to it as "Privacy policy". It said the site "uses Google Analytics", unconditionally, and did not mention Microsoft Clarity, consent or withdrawal. |

## Owner decision: Microsoft Clarity disabled for this release

**Requirement:** the client area, login, dashboard, admin and any authenticated or sensitive screen must never be recorded, including after an in-app (SPA) transition from a public page.

**Routing and Clarity lifecycle inspected (src/App.jsx):**
- Sensitive routes: `/login`, `/dashboard`, `/espace-client`, `/admin`. They are reached by:
  - `navigate()` (`history.pushState`);
  - the browser history (`popstate` handler);
  - the auth redirects, which call `history.replaceState` then `setPathname` (dashboard/admin to login, login to dashboard).
- The **login dialog** (`AuthModal`: e-mail and password) also opens on public pages through `onAuthOpen`, without any route change. For logged-in visitors, the header on public pages also shows account controls.
- Once loaded, Clarity cannot be stopped (no stop API: only `consent(false)` and a reload). It also follows history changes by itself.

A route-level exclusion would therefore need to intercept `pushState`, `replaceState` and `popstate` before React renders, reload into every sensitive route, and treat the login dialog as sensitive too. Its interaction with the real Clarity script cannot be verified here: tests must not load the real script against the real project. **Following the owner's rule, Clarity is disabled entirely:**
- `CLARITY_ENABLED = false` (src/utils/clarity.js): `initializeMicrosoftClarity()` returns before doing anything. There is no script, no `window.clarity`, no queue and no request, on any route, whatever is stored.
- The consent UI no longer offers a Clarity option, so it does not pretend to activate a disabled service. Every saved choice stores `recording: false`. A stored `recording: true` (from Preview reviews) is ignored.
- Leftover first-party `_clck`/`_clsk` cookies from earlier visits are still deleted at startup.
- `<body data-clarity-mask="true">` stays in `index.html`. It is inert without Clarity and keeps masking the default if Clarity returns.

**Re-enabling Clarity is a separate future LOT.** It requires:
1. a verified exclusion of the sensitive routes **and** of the login dialog, across `pushState`/`replaceState`/`popstate`, with a full reload when leaving a recorded page for a sensitive one;
2. a browser test of that exclusion that does not send data to the real project;
3. Strict masking set in the Clarity dashboard, and a synthetic recording inspected;
4. the policy and banner texts restored (the reviewed text is in this doc's git history, commit 4b33ecf);
5. `CONSENT_POLICY_VERSION` bumped so that every visitor is asked again for the new purpose.

## GA4: sign-in credentials in the address

`urlContainsCredentials(href)` (src/utils/analytics.js) detects these parameters in the query or fragment:
- `access_token`, `refresh_token`, `provider_token`, `provider_refresh_token`, `id_token`;
- `token_hash`, `token`, `code`;
- `error_code`, `error_description` (failed callbacks).

1. **Before GA4 runs:** at startup, or when consent is given, GA4 is **not started** while the address carries such a parameter. The stored consent and the existing `_ga` cookies are kept, and GA4 starts on the next clean page load.
2. **GA4 already running:** once GA4 has started, the site watches address changes: `history.pushState` / `replaceState` (wrapped), `popstate` and `hashchange`. Whenever the address carries credentials, Google's official opt-out flag `window["ga-disable-G-DPEYZ4C8BD"]` is raised **before** the change happens, so gtag.js itself sends nothing either (for example a history-based page view, if that is enabled in the property). The flag is lifted when the address is clean again **and** consent still holds; after a withdrawal it stays raised.
3. **Our helpers:** `trackPageView()` and `trackEvent()` also send nothing while the address carries credentials.

In this app, sign-in returns are full page loads (case 1). Case 2 is defence in depth, browser-tested with `pushState`, `replaceState`, hash assignment and error callbacks.

## Consent contract

| Category | Vendor | Default | Loads when |
| --- | --- | --- | --- |
| Necessary | the stored choice (`localStorage["dl-consent"]`), Supabase session after sign-in | always | — |
| `analytics` | Google Analytics 4 | **off** | the visitor opted into "Mesure d’audience" **and** `isTrackingAllowed()` **and** the address carries no sign-in credential |
| `recording` | Microsoft Clarity | **disabled** | never in this release (no option offered; stored value ignored; always saved as `false`) |

- **Stored record:** `{"version":1,"analytics":bool,"recording":bool,"date":"YYYY-MM-DD"}`.
  - The day-precision date only serves expiry. There is no identifier, and the record is never sent.
  - A record that is absent, malformed, tampered with, from another `CONSENT_POLICY_VERSION`, dated in the future or **older than 6 months** counts as *no choice*: nothing optional loads, the record is removed and the banner is shown again.
  - Bump `CONSENT_POLICY_VERSION` (src/utils/consent.js) whenever vendors or purposes change, including re-enabling Clarity.
- **Prior consent:**
  - Without a valid opt-in, gtag.js is never requested. `window.gtag` stays undefined, and `trackEvent()` and `trackPageView()` are no-ops: they check an internal "enabled" flag, not just the presence of `window.gtag`.
  - No page view is sent before consent.
  - Leftover `_ga*`, `_gid`, `_gat*`, `_clck` and `_clsk` cookies from earlier, un-consented visits are deleted at startup.
- **When consent is given during a visit:** GA4 loads once, and the page being viewed at that moment is recorded once. Earlier pages and interactions are never replayed.
- **GA4 configuration with consent:** Consent Mode defaults to `analytics_storage: granted` and `ad_storage`, `ad_user_data` and `ad_personalization: denied`; `allow_google_signals: false`; `allow_ad_personalization_signals: false`. The event names and parameters are unchanged. The `_ga` cookie lifetime is left at Google's default (not changed without owner approval).
- **Withdrawal or change:** through the footer button "Gérer les cookies / Cookie settings", present on every public page. GA4 stops in place, with no reload:
  - Google's official opt-out flag `window["ga-disable-G-DPEYZ4C8BD"] = true` is set;
  - Consent Mode is updated to `analytics_storage: denied`;
  - our helpers stop sending, and the `_ga*` cookies are deleted on the host and parent domains;
  - re-consent on the same page lifts the flag.
- **Where the UI shows:**
  - On the production domains.
  - On Vercel Previews, for review only. There `isTrackingAllowed()` still blocks every vendor, so choices change nothing.
  - Never on localhost, in development or in the build-time prerender. The existing UI suites therefore run unchanged, and the static HTML contains no banner.

## UI

- **Banner** (`src/components/ConsentManager.jsx`, rendered next to `<App />` in `main.jsx` so it is first in keyboard order). The approved design is unchanged; only the text now names Google Analytics alone:
  - a region labelled by its heading, with FR/EN text following `<html lang>`;
  - three buttons with **identical style and size**: Tout refuser / Personnaliser / Accepter tout (Reject all / Customize / Accept all);
  - a link to `/politique-de-confidentialite#cookies` with `hreflang="fr"`. The English label reads "Privacy policy, cookies section (in French)";
  - the site stays usable without choosing: no wall, and no choice counts as refusal.
- **Preferences dialog** (native `<dialog>`, modal, focus moves inside, Escape closes without saving):
  - a "Nécessaires" group, always active;
  - one unchecked-by-default checkbox, "Autoriser Google Analytics", with its purpose, data and cookies described;
  - Tout refuser / Enregistrer mes choix / Accepter tout, with the same style;
  - a "Fermer sans changer" button.
- **Footer:**
  - a "Gérer les cookies" button in the legal links, which reopens the dialog pre-filled with the current choice. Saving announces "Vos choix ont été enregistrés." through a polite live region;
  - the English footer's policy link now reads **"Privacy policy (in French)"** with `hreflang="fr"`.
- **Layout:**
  - fixed at the bottom, at most 920 px wide, with 16 px gutters (8 px at 560 px and below);
  - stacked full-width buttons on phones, all at least 44 px tall;
  - no horizontal overflow at 320, 390 or 1440 px.

## Privacy notice

**Applied to the French page (`/politique-de-confidentialite`):**
- Section 2: "with your consent, the site also uses an audience-measurement tool (Google Analytics), described in section 3".
- Section 3 "Cookies et mesure d’audience" (`#cookies`):
  - GA4 is optional and off by default; it covers purpose, data categories and cookies, with Google signals and ad personalization disabled;
  - typed data is excluded from GA4 measurements; measurement is not activated while the page address contains sign-in elements;
  - **Clarity:** "Le site n’utilise pas d’outil d’enregistrement de session : Microsoft Clarity n’est pas chargé. Les cookies Clarity (_clck, _clsk) déposés sur ce site lors de visites antérieures sont supprimés.";
  - necessary storage, including the 6-month choice renewal;
  - withdrawal through "Gérer les cookies": stops measurement and deletes the GA cookies on this site;
  - **legal basis:** consent (art. 82 loi Informatique et Libertés for cookies; GDPR art. 6.1.a); withdrawal is not retroactive (GDPR art. 7.3);
  - **provider role and transfers, attributed to Google's own statements ("Google indique"):** processor for GA, no IP logging, DPF with SCCs as a fallback;
  - **retention, separating vendor-stated values from account settings:**
    - vendor-stated default: `_ga` / `_ga_…` cookies 2 years ("selon Google… par défaut"; not overridden in code);
    - account setting: GA detailed data retention is a property setting, capped at 14 months for a standard (non-360) property; aggregated reports unaffected. The actual value (2 or 14 months) is not stated because it was not verified;
  - a link to Google's privacy policy.
- Section 10 "Droits RGPD" (formerly 9) adds:
  - portability;
  - withdrawal of consent via "Gérer les cookies";
  - the one-month answer period (GDPR art. 12.3);
  - the **right to complain to the CNIL** (link to cnil.fr/fr/adresser-une-plainte).
- Section 11 (formerly 10): the date is rendered from `PRIVACY_POLICY_LAST_UPDATED` (see the pre-release warning).
- DL-PRIVACY-FINAL-01 additions: see the next section.
- Preserved unchanged:
  - controller identity (section 1);
  - e-mail requests and former form requests (section 2);
  - the internal Google automation (Sheets, Drive), purposes, access limits, revocation and the Google API Limited Use disclosure (sections 5–9 and 12, formerly 4–8 and 11).

## DL-PRIVACY-FINAL-01: recipients, legal bases and retention

Verified facts (15 November 2026), read-only:
- **Vercel** hosts the whole site; static pages served from a Paris edge (`cdg1`), API routes run in `iad1` (United States). Both e-mail API routes are disabled (`/api/send-contact-email` returns 410; `/api/send-quote-email` returns 403 in production, probably a firewall rule). Vercel DPA (updated 17 March 2026): Vercel is a processor, primary processing facilities in the United States, EEA transfers under the 2021 SCCs. https://vercel.com/legal/dpa
- **Supabase** project `gcsqoluyfgkpwhtbpnzj` (from the production bundle) handles authentication, the client-area tables and the private `request-documents` bucket. The project is not in the connected Supabase account, so its **region is unknown**. Public auth settings: e-mail and Google sign-in enabled, sign-up open, `mailer_autoconfirm: true` (no confirmation e-mail). The site has no password-reset flow. Supabase DPA (version 1, 1 August 2026): processor; contracting entity Supabase Pte. Ltd, Singapore; SCCs; customers can direct a processing region. https://supabase.com/legal/dpa
- **E-mail:** quote and contact requests are mailto drafts sent from the visitor's own mail client; the site's servers never receive them. `digitallab.studio` MX records point to OVHcloud (`mx*.mail.ovh.net`); whether the mailbox is hosted there or forwarded elsewhere is unknown.
- **Resend:** the domain has Resend DNS records (`resend._domainkey`, `send` subdomain), but no code path uses Resend today: both API routes are disabled, and the `send-quote-email` Supabase function in the repo is never called. Before WEB-CONTACT-SIMPLE-01, contact-form enquiries were sent through Resend. Resend is therefore **not** named on the page.
- **Retention:** no automatic deletion, scheduled clean-up or self-service account deletion exists. Only database cascades remove data when a parent record or user is deleted.

Applied to the page:
- Section 2: account data (e-mail and password, or Google sign-in data; role; requests, messages, documents with their limits; quotes and refusal comments) and **legal bases**, separating pre-contractual measures, contract, legitimate interest (accounts without a current service), legal obligation (documents required by law) and consent (analytics).
  - **Legal review required, not validated:** the legitimate-interest basis (GDPR art. 6.1.f) for accounts with no service in progress and for following up exchanges is a proposal. A lawyer must confirm it, or replace it, before release.
- Section 8 states retention criteria only ("pendant la durée de la relation", no automatic deletion yet). The periods in the matrix below are proposals and are **not** on the public page.
  - **DL-PRIVACY-RELEASE-01 (owner-approved wording):** the earlier text promised retention "uniquement pendant la durée nécessaire" and "pendant la durée de la relation", but nothing is deleted when the relationship ends. Section 8 now reads: minimisation principle; data kept "pendant la relation avec Digital Lab et, à ce jour, jusqu’à leur suppression"; "Aucune suppression automatique n’est actuellement en place"; deletion on request "sous réserve des obligations légales de conservation". The 3-year and accounting (10-year) periods in the matrix below are owner-approved drafts awaiting legal review; they are not on the page and not implemented.
- Unresolved provider details stay off the public page and are listed as verification requirements in owner point 6: <ul><li>Supabase region;</li><li>DPA applicability;</li><li>OVH forwarding;</li><li>Resend's current use;</li><li>Vercel log retention.</li></ul>
- New section 4 "Destinataires et hébergement": Vercel, Supabase (Pte. Ltd, Singapore), OVHcloud (receives mail sent to the contact address), Google sign-in, and transfers attributed to the providers' own statements ("indiquent"). No Supabase region and no Resend mention.
- Section 6: purpose "account management, documents, quotes and access security".
- Section 8: retention for the duration of the relationship, **no automatic deletion yet**, deletion on request except documents kept under a legal obligation.
- Legal notice: the removed contact form is no longer mentioned.
- Sign-in dialog: a "Politique de confidentialité" link under the form, in both login and sign-up modes. Authentication behaviour is unchanged.

**Retention rules: internal policy DRAFTS pending legal validation (DL-PRIVACY-RELEASE-02, made practical in DL-PRIVACY-SIMPLIFY-01). Internal only: not stated on the public page until the owner runs the manual review below. Nothing is automated.**

| Data | Legal minimum or maximum | Proposed period (owner decision) | Today |
|---|---|---|---|
| Prospects: e-mail requests and accounts with no order | No legal minimum | Up to 3 years from the last contact initiated by the person (CNIL guidance on prospect data) | Kept in the OVHcloud mailbox and, where routed or copied there, in Gmail; no deletion in either |
| Inactive accounts (e-mail, role, sign-in data) | None | Reviewed at each annual manual review; deletion assessed once there is no service, quote or request in progress and no contact for about 3 years | No deletion |
| Active clients: client-area requests, messages, documents | None, unless a document is an accounting record | Duration of the relationship; afterwards kept only with a documented reason (e.g. warranty or dispute, generally up to 5 years: civil limitation period, art. 2224 Code civil), otherwise handled as a prospect | No deletion |
| Quotes not accepted | None | Same as prospects: up to 3 years from the last contact | No deletion |
| Accepted quotes, invoices and other accounting records | **10 years** (Code de commerce, art. L123-22), if the document is an accounting record: lawyer to confirm for accepted quotes | Applicable statutory period: 10 years for accounting records | No deletion |
| Vercel request logs | Provider-defined | Provider default (check the plan) | Unknown |
| GA4 | See section 3 | Property settings (owner-verified): event data 2 months, user data 14 months | Set in GA4; `_ga` cookie lifetime separate (Google default, 2 years) |

**Manual review and deletion procedure (internal draft, DL-PRIVACY-SIMPLIFY-01; not an implemented process yet, not run, no automation):**

*On request (within one month):*
1. Check that the request comes from the account's e-mail address (or ask for a reply from it). Verify identity **proportionately**: ask for more only when there is a reasonable doubt about who is asking, and never collect or keep identity documents that are not needed (CNIL guidance). Log the date in a private register: date, request, action, date answered. Do not copy the data itself.
2. **Before deleting anything**, check the applicable retention obligations (invoices, accounting records, a dispute in progress) and find every linked record: account, files, requests, quotes, e-mails. A request does **not** mean deleting everything automatically on receipt.
3. Delete or anonymise what is not under an obligation:
   - the user in the Supabase dashboard (Authentication > Users). Per the repo SQL, the cascade removes the messages and document records the user created;
   - explicitly, what the cascade does **not** remove: the stored files in the `request-documents` bucket, and the person's `contact_requests` and quotes (the `contact_requests` definition is not in the repo);
   - the related e-mails in the OVHcloud mailbox **and** in Gmail.
4. Keep apart only the documents with a legal retention obligation (invoices, accounting records), and name them in the reply.
5. Reply to the person confirming what was deleted and what is kept, and why.

*Once a year (suggested: January; proposed, not yet an implemented process):*
1. List the accounts and requests with no service, quote or request in progress and no contact for about 3 years. Delete them by the steps above, or record a reason to keep them (dispute, warranty, ongoing discussion).
2. Delete the matching e-mail threads in OVHcloud and Gmail.
3. Check that invoices and accounting records past their statutory period can go.
4. Note the review date and counts in the register.

*Public page:* once the owner has run this review at least once and commits to running it every year, section 8 may say: "les demandes et comptes sans relation en cours sont réexaminés chaque année et supprimés au plus tard 3 ans après le dernier contact, sauf obligation légale de conservation." Until then, the page keeps the current factual wording (kept until deletion, no automatic deletion).

**Legitimate interest (art. 6.1.f), reasoning (DL-PRIVACY-SIMPLIFY-01):**
- **Kept for:**
  - the *security of the client area* (access control, abuse prevention), which GDPR recital 49 names as a legitimate interest;
  - the *follow-up of exchanges with people who contacted Digital Lab*, which the CNIL accepts for prospect management within a limited period.
- **Removed for:** *managing an account opened without a service in progress*. A visitor opens the client area to send and follow requests, so managing it is a pre-contractual measure taken at their request (art. 6.1.b), or the contract once a service is ordered. Keeping an account *after* the relationship has ended is a retention question, handled by the annual review, not a separate legitimate interest.
- **Remaining uncertainty (legal review):**
  - whether an account kept long after the last request still falls under 6.1.b;
  - whether the 3-year prospect period and the 5-year post-contract justification suit this business;
  - whether accepted quotes count as accounting records (10 years).

**Sources (consulted 15 November 2026):**
- CNIL, cookies: what the law says (information, withdrawal): https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi
- CNIL, cookies FAQ / consolidated recommendation. Keeping the choice 6 months is good practice. The 13- and 25-month limits apply only to audience tools exempt from consent: https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ
- CNIL, complaints: https://www.cnil.fr/fr/adresser-une-plainte
- Google, GA4 data retention (2 or 14 months; aggregated reports unaffected): https://support.google.com/analytics/answer/7667196
- Google, GA4 cookies (`_ga`, `_ga_<id>`: 2 years): https://support.google.com/analytics/answer/11397207
- Google, Analytics data privacy (processor role; IP addresses not logged or stored): https://support.google.com/analytics/answer/6004245
- Google, processor services list (Google Analytics listed): https://business.safety.google/adsservices/
- Google, data transfers (EU-US DPF; SCCs): https://business.safety.google/adsdatatransfers/
- For a future Clarity re-enablement: Microsoft, Clarity FAQ (controller role; Azure; MIOL + SCCs; 30-day / 9-month retention): https://learn.microsoft.com/en-us/clarity/faq

**English copy.** No English policy page exists. If one is published, use this text:

> **Cookies and audience measurement.** Audience measurement is optional and off by default. It loads only after you consent in the "Your cookie choices" banner. Without consent, or if you refuse, it does not load and the site works normally.
>
> Audience measurement — Google Analytics (Google): pages viewed, visit source, device and browser type, approximate location, and use of the price estimator (services and packages chosen, never typed text). Cookies: `_ga`, `_ga_…`. Google signals and ad personalization are disabled.
>
> Website addresses, problem descriptions, e-mail addresses, names and messages you type are not included in the measurements sent to Google Analytics. Measurement is not activated while the page address contains sign-in elements (for example when returning from a Google sign-in or a password-reset link).
>
> The site does not use a session-recording tool: Microsoft Clarity is not loaded. Clarity cookies (`_clck`, `_clsk`) set on this site during earlier visits are deleted.
>
> Necessary storage, without consent: remembering your choice on your device (local storage `dl-consent`, renewed at least every 6 months) and, if you sign in, your client-area session. You can change or withdraw your consent at any time with "Cookie settings" at the bottom of the page; withdrawal stops audience measurement and deletes the Google Analytics cookies set on this site.
>
> Legal basis: your consent (article 82 of the French Data Protection Act for cookies, article 6(1)(a) GDPR for the data). Withdrawing consent does not affect processing carried out before the withdrawal.
>
> Provider role and transfers outside the European Union: Google states that it acts as a processor for Google Analytics, and that Google Analytics does not log or store IP addresses. Data may be processed in the United States; Google states that it relies on the EU-U.S. Data Privacy Framework and, where applicable, on the European Commission's standard contractual clauses.
>
> Retention: according to Google, the `_ga` and `_ga_…` cookies expire by default after 2 years; the retention period for detailed data is a Google Analytics account setting and cannot exceed 14 months (aggregated statistical reports are not subject to this limit). Google processes this data under its own privacy policy (policies.google.com/privacy).
>
> **Your rights.** Under the GDPR you may request access to, rectification, erasure or restriction of your data, and its portability. You may object to certain processing where the law allows, and withdraw your consent to optional cookies at any time with "Cookie settings" at the bottom of the page. To exercise your rights, contact Digital Lab by e-mail; you will receive an answer within one month. If you believe your rights are not respected, you may lodge a complaint with the CNIL: www.cnil.fr/fr/adresser-une-plainte.

## DL-PRIVACY-FINAL-02: verified infrastructure facts

Facts supplied by the owner (16 November 2026). Read-only: no database, provider or analytics configuration was changed in this LOT.

| Area | Status | Fact |
|---|---|---|
| Supabase | **Verified** (owner's connected Supabase account) | Project `digital-lab-prod`, ref `gcsqoluyfgkpwhtbpnzj`, region **`eu-west-1` (Ireland)**, status `ACTIVE_HEALTHY`. Supersedes "region is unknown" in DL-PRIVACY-FINAL-01. |
| Supabase | Inferred | Auth, database and Storage of a Supabase project run in the project region. |
| Supabase | Unknown | Whether Supabase or its sub-processors access or process data outside the EU (support, backups, logs). The page therefore does not claim Ireland-only processing. |
| GA4 | **Owner-verified** | Property "Digital Lab Website", `G-DPEYZ4C8BD`: event data retention **2 months**; user data retention **14 months**; Google signals **disabled**; **no** Google Ads links; GA Data Processing Terms **accepted 31 July 2026**; all four optional account-level data-sharing settings **switched off** and saved. |
| GA4 | Note | These are property data-retention settings, not cookie lifetimes. The `_ga` / `_ga_…` cookie lifetime is still Google's default (2 years) and unchanged in code. |
| GA4 | Unknown | Whether the property is standard or 360 (only matters if the 14-month cap ever changes). |
| E-mail | **Verified** | `contact@digitallab.studio` is an active OVHcloud **Zimbra Starter** mailbox; the Zimbra redirection list and filter list are empty; Gmail has no external POP mailbox configured. |
| E-mail | **Verified (one message)** | A test message of 20 October 2026, addressed to `contact@digitallab.studio`, appeared in Gmail; its headers show OVHcloud mail-out infrastructure delivering to Gmail. |
| E-mail | Inferred | OVHcloud and Google both handled that message, so business correspondence can reach Gmail. |
| E-mail | Unknown | The exact rule that routes mail to Gmail (it is not a Zimbra redirection, Zimbra filter or Gmail POP import, so it may be an OVH-level redirection/alias or another mechanism); whether **all** messages are copied; whether the Zimbra mailbox is the routing origin; whether the Gmail account is a consumer account or Google Workspace (this affects Google's role: processor vs. independent controller). |

Applied to the page (section 4 only):
- Supabase: "Le projet Supabase de Digital Lab est déployé dans la région eu-west-1 (Irlande)." The transfer paragraph adds that this deployment does not exclude processing or access outside the EU.
- OVHcloud: now described as the provider of the business mailbox (was "réception des e-mails").
- Google (Gmail): a separate paragraph, deliberately **outside** the list of providers acting "pour le compte de Digital Lab", so the page does not claim Google is a processor for a possibly personal Gmail account. Worded as "peuvent également être acheminés ou copiés" (no forwarding mechanism and no "all messages" asserted), Google processes them "selon ses propres conditions", plus a sentence that Gmail mail may be processed by Google outside the EU.
- A sentence keeps the three Google uses distinct: mail, sign-in, audience measurement.
- Section 3 (GA4) **unchanged**: its text ("Google signals and ad personalization disabled"; detailed-data retention is an account setting capped at 14 months; `_ga` cookies 2 years by Google's default) is consistent with the verified settings. Stating the exact 2-month / 14-month values on the page is optional, owner's choice (see point 2).

Not changed: analytics scripts, consent behaviour, events, pricing, estimator, social media packages, authentication, mail routing, database, production configuration, PR #9. Clarity stays disabled.

## Points needing owner or legal confirmation (not decided here)

| # | Item | Who / when |
|---|------|------------|
| 1 | **Policy date:** set to `2026-11-17` for a planned publication on 17 November 2026 (DL-PRIVACY-RELEASE-03); `npm run check:privacy-date` passes. If publication slips, set it again to the actual publication day before deploying. | Owner, at release |
| 2 | **GA4 property retention setting:** owner-verified (event data 2 months, user data 14 months; DL-PRIVACY-FINAL-02). The page text (account setting, at most 14 months) stays consistent. Optional: state the exact values on the page. | Owner (optional wording) |
| 3 | **`_ga` lifetime of 2 years** (Google default). The CNIL's 13-month cap formally applies to consent-exempt tools, but a shorter lifetime (`cookie_expires`) is common good practice. Not changed without owner approval. | Owner / legal |
| 4 | **GA4 dashboard:** done (DL-PRIVACY-FINAL-02, owner-verified): Google signals off, no Google Ads links, Data Processing Terms accepted 31 July 2026, optional data sharing off. | Closed |
| 5 | **Legal bases, transfers and retention (DL-PRIVACY-FINAL-01/02).** Bases now stated in section 2. A lawyer should confirm: legitimate interest for accounts with no current service; whether accepted quotes are accounting records (10 years); the transfer wording for Vercel, Supabase (Singapore entity, Ireland region) and Gmail, including Google&#39;s role for Gmail; and the retention criteria. The retention rules are owner-approved drafts (DL-PRIVACY-RELEASE-02 / SIMPLIFY-01) and need legal review. The manual procedure needs the owner to adopt it and run it once before section 8 states any period. Legitimate interest is now limited to security and the follow-up of exchanges (reasoning above). | Legal review / owner |
| 6 | **Recipients (DL-PRIVACY-FINAL-01).** Now in section 4. Still to confirm: <ul><li>~~the Supabase project region~~: verified `eu-west-1` (Ireland), DL-PRIVACY-FINAL-02;</li><li>that the Vercel and Supabase DPAs apply to your accounts;</li><li>the mechanism that routes or copies mail to Gmail (not a Zimbra redirection, filter or Gmail POP import), whether all messages are copied, and whether the Gmail account is consumer or Workspace (Google&#39;s role). Gmail is now named as an additional recipient;</li><li>whether Resend still sends anything, and its retention of past contact-form enquiries;</li><li>Vercel log retention on your plan.</li></ul> | Owner |
| 7 | **English policy page:** publish the English copy above as a page, or keep the French page with the "(in French)" labels. The English "Legal notice" footer link also leads to a French page. | Owner |
| 8 | **6-month choice lifetime:** the CNIL calls it good practice; confirm. | Owner |
| 9 | **Clarity in the Microsoft account:** the project stays configured but receives nothing from this site. Optionally pause or delete it there, and check that existing recordings expire (Microsoft: 30 days; favorites and samples up to 9 months). No account change was made here. | Owner |
| 10 | **Clarity re-enablement:** separate LOT; see the requirements above. | Owner, later |

### DL-PRIVACY-SYSTEME-01 release gates

The owner verified that the [Audit Gratuit funnel](https://a59f-contact.systeme.io/audit-gratuit) collects the site URL and email, stores the request and contact in Systeme.io, sends the requester a confirmation and notifies Digital Lab. The funnel displays a data-processing notice and links to the Digital Lab policy. No separate marketing opt-in has been verified or authorized. The [provider’s privacy policy](https://systeme.io/fr/privacy-policy) identifies ITACWT Limited in Ireland and describes AWS Ireland hosting. Confirm the account-specific terms separately.

Before production release, the owner should close these gates:

- **DPA and data flows:** confirm account-level DPA applicability and acceptance, provider roles, subprocessors, processing locations and any applicable transfer safeguards.
- **Retention and deletion:** confirm retention criteria and deletion procedures for funnel requests, contact records and transactional email records.
- **Funnel cookies and third-party scripts:** inspect the live funnel before any choice and after acceptance or refusal. Document scripts, storage and requests, then verify the appropriate disclosure and any required consent. The Digital Lab banner only governs the Digital Lab site.
- **UTM attribution:** verify whether landing UTMs are stored, used for tracking, associated with a contact, or forwarded to third parties. Apply the corresponding disclosure and consent requirements.
- **Publication:** set `PRIVACY_POLICY_LAST_UPDATED` to the actual publication date on release day, align the browser assertion and verify that the funnel link serves the updated notice. The date script cannot verify the actual date of publication.

## Integration safety

- Unchanged: prices, package and billing rules, locks, the estimator, website, repair, Social Media, Reels, `quoteMailto` and the copy fallback; event names and parameters; `trackingEnvironment.js`; the prerender block list; `api/` and `supabase/`.
- `scripts/check-repair-ui.mjs`: one assertion changed. On localhost it used to expect a stubbed `gtag` to receive `estimator_quote_request`. Since nothing may be sent without consent, it now asserts that the stub receives **no** call. Its privacy checks are unchanged. The check that GA4 never receives the repair URL or description *with consent* moved to `check-consent-ui.mjs`, which runs it on the real production path.
- Behaviour changes to expect:
  - GA4 volume drops to the visitors who consent;
  - visitors returning from a sign-in link are measured from their next page load;
  - Clarity recordings stop entirely;
  - leftover `_ga` and `_clck` cookies of returning visitors are deleted on their first visit after deployment.

## Files

- Added:
  - `src/utils/consent.js`
  - `src/utils/consent.test.js`
  - `src/utils/trackingConsent.js`
  - `src/components/ConsentManager.jsx`
  - `src/components/ConsentManager.css`
  - `scripts/check-consent-ui.mjs`
  - `scripts/check-privacy-date.mjs`
  - `docs/DL-PRIVACY-CONSENT-01.md`
- Modified:
  - `src/main.jsx`: no unconditional vendor loading; consent startup and `<ConsentManager>`.
  - `src/utils/analytics.js`: load only on call; enabled flag; Consent Mode and no signals; `disableGoogleAnalytics`; `urlContainsCredentials` and the address guard for a running GA4.
  - `src/utils/clarity.js`: `CLARITY_ENABLED = false`; consentv2, body mask and `withdrawMicrosoftClarity` (cookie clean-up) kept for re-enablement.
  - `src/App.jsx`:
    - footer "Gérer les cookies" button, plus the English policy link labelled "(in French)";
    - privacy policy sections 2, 3, 9 and 10;
    - `PRIVACY_POLICY_LAST_UPDATED`;
    - DL-PRIVACY-FINAL-01: policy sections 2, 4 (new), 6 and 8, renumbering, the legal-notice sentence, and the privacy link in the sign-in dialog.
    - DL-PRIVACY-FINAL-02: policy section 4 only (Supabase region, OVHcloud mailbox, Gmail recipient, transfer sentences).
  - `scripts/check-consent-ui.mjs` (DL-PRIVACY-FINAL-02): section 4 needles and a no "Ireland-only" overclaim check.
  - `src/App.css` (DL-PRIVACY-FINAL-01): `.auth-privacy-note` styles.
  - `index.html`: `<body data-clarity-mask="true">`.
  - `scripts/check-repair-ui.mjs`: the assertion above.
  - `package.json`:
    - `consent.test.js` in `npm test`;
    - `check:consent:ui`, appended to `check:pricing:ui`, which CI runs;
    - `check:privacy-date` (pre-release only).

## Tests

- `consent.test.js` (9 tests):
  - only valid records count; absent, malformed, outdated, tampered and future records do not;
  - 6-month expiry;
  - the minimal serialized record;
  - UI hosts: production and Vercel Preview yes, localhost and development no;
  - cookie deletion on the host and parent domains only, for matching names only;
  - no-op outside a browser;
  - sign-in credentials detected in query and fragment, ordinary addresses not;
  - Clarity disabled, even with a stored opt-in.
- `check-consent-ui.mjs` runs against the built site, with the production and Preview hostnames mapped to the local server and every external request aborted and recorded:
  - **No choice** (FR/EN × 1440, and 390 mobile with touch, plus 320):
    - zero GA4 requests and globals; leftover vendor cookies deleted;
    - estimator use changes nothing;
    - no Clarity mention or toggle in the banner or dialog;
    - reject, customize and accept identical in style and height; at least 44 px targets; banner inside the viewport; no overflow.
  - **Refuse all:** persisted; nothing after a reload either.
  - **GA4 via Customize,** keyboard-driven (Enter, Space; Escape closes without saving; nothing prechecked; one checkbox only; focus inside the dialog):
    - gtag requested once;
    - Consent Mode defaults and the config without signals verified;
    - one `page_view` at consent, none replayed;
    - `estimator_quote_request` keeps its four parameters;
    - the repair URL, description and name never appear in any payload;
    - after a reload, loaded once with one `page_view`.
  - **Stored Clarity opt-in** (EN): nothing loads; `_clck`/`_clsk` deleted; no toggle; a new save stores `recording: false`.
  - **Accept all + public→private SPA:**
    - GA4 loads once per page load, Clarity never;
    - in-app navigation into `/dashboard`, `/admin`, `/espace-client` and `/login` through the App's own history/popstate path (redirected to `/login`, where the login dialog opens), then back: no Clarity script, global or request.
  - **Withdraw GA4 through the footer control** (keyboard): no reload, opt-out flag set, Consent Mode denied, `_ga` cookies deleted, no further event. **Re-consent** in place: flag lifted, one new page view.
  - **Sign-in tokens in the address** (`/#access_token=…&refresh_token=…`, with stored GA4 consent):
    - nothing loads or is sent on that page load, even after in-app navigation;
    - the `_ga` cookie is kept;
    - GA4 starts on the next clean load, and no token appears in any payload.
  - **GA4 already running when credentials appear during the session** (`pushState` fragment, `replaceState` `?code=`, hash assignment, error callback):
    - the opt-out flag is raised and no `estimator_quote_request` is queued while the address is dirty;
    - the flag is lifted and events resume once the address is clean;
    - after a withdrawal the flag stays raised on a clean address; re-consent lifts it.
  - **Login dialog opened from a public page:** a typed synthetic e-mail and password appear in no GA4 payload; no Clarity.
  - **Invalid, outdated, expired and tampered records** count as no consent and are removed.
  - **Vercel Preview:** banner shown, but "accept all" loads nothing. **Localhost:** no banner and no footer button.
  - **Privacy policy:**
    - documents GA4, the legal basis, rights and the CNIL, and that Clarity is not used;
    - no stale Clarity text remains;
    - the banner deep link lands below the sticky header;
    - the English footer link reads "Privacy policy (in French)" with `hreflang="fr"`;
    - section 4 names the Supabase region, the OVHcloud mailbox and Gmail as an additional recipient, with no Ireland-only claim.
  - **Globally:** no request to `clarity.ms` in any scenario; no other third-party host requested.
- Mutation checks (run locally, not committed): with `CLARITY_ENABLED = true`, or with the credential guard removed, the suite fails.
- **Header suite (`check-header-ui.mjs`):** one failure in a long sequential local run on 15 November 2026 was not reproduced in 6 further runs (3 alone, 3 right after both sticky suites). It is recorded as the known timing flake of its compact-height and scroll-state samples taken just after scrolling (also seen in DL-ESTIMATOR-STICKY-01: 149 px sampled, settling to 116 px). This LOT changes no header code or CSS, and the header implementation was not touched.
- Screenshots (ignored, not committed): `consent-review.local/`:
  - `FR/EN-1440-banner`, `FR/EN-390-banner`, `FR-320-banner`;
  - `FR-320-preferences`, `FR-1440-preferences`;
  - `FR-privacy-cookies-section`.

## Recommended release order relative to PR #9

1. Review and approve this LOT, including the points above.
2. On the publication day, set the policy date, run `npm run check:privacy-date`, then merge and deploy.
3. After deployment, in a real production browser:
   - check that nothing loads before consent;
   - give consent and check GA4 Realtime;
   - confirm that no `clarity.ms` request appears on any page, including after signing in;
   - withdraw consent.
4. Rebase PR #9 (estimator tracking) onto the new `main`.
   - Its `check-tracking-ui.mjs` reads GA4 events on the production host. It must seed a granted `dl-consent` record, or click "Accepter tout", before asserting events: without consent no event is sent, by design.
   - Expect a small conflict in `package.json` scripts.
   - Then lift its production block.
5. Register the GA4 custom dimensions for PR #9 before that deployment.
