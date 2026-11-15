// DL-PRIVACY-CONSENT-01 browser regression: consent-first GA4 and Microsoft Clarity on the built
// site (run `npm run build` first).
//
// The production hostname and a Vercel Preview hostname are mapped to the local preview server,
// so the real guard (isTrackingAllowed + import.meta.env.PROD) and the real consent flow decide.
// Every request leaving the local server is recorded and aborted: gtag.js and Clarity never
// execute and nothing reaches Google or Microsoft. A vendor "load" = its script request, and the
// calls the site makes are read from the gtag dataLayer and the clarity queue.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

const PORT = 4361;
const PROD = "www.digitallab.studio";
const PREVIEW = "digital-5ch2zx7fe-elenamihalska70-creators-projects.vercel.app";
const LOCAL_HOSTS = [PROD, PREVIEW, "127.0.0.1"];
const GA_SCRIPT = /^www\.googletagmanager\.com$/;
const CLARITY_SCRIPT = /^www\.clarity\.ms$/;
const TRACKER = /google-analytics|googletagmanager|doubleclick|clarity\.ms|bing\.com|facebook|hotjar/;
const KEY = "dl-consent";

const out = new URL("../consent-review.local/", import.meta.url);
await mkdir(out, { recursive: true });
const shotPath = (name) => new URL(name + ".png", out).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const server = await preview({ preview: { host: "127.0.0.1", port: PORT, strictPort: true, allowedHosts: true } });
let browser;
const rows = [];
const externalSeen = new Set();
try {
  browser = await chromium.launch({ headless: true, args: [`--host-resolver-rules=MAP ${PROD} 127.0.0.1, MAP ${PREVIEW} 127.0.0.1`] });

  const session = async ({ host = PROD, mobile = false, width = mobile ? 390 : 1440, height = mobile ? 844 : 900, cookies = [] } = {}) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
    const requests = [], writes = [], errors = [];
    await context.route("**/*", (route) => {
      const request = route.request(), url = new URL(request.url());
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method() + " " + url.hostname);
      if (!LOCAL_HOSTS.includes(url.hostname)) {
        requests.push(url.hostname + url.pathname);
        externalSeen.add(url.hostname);
        return route.abort();
      }
      if (!["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
      return route.continue();
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    if (cookies.length) await context.addCookies(cookies);
    await context.addInitScript(() => {
      document.addEventListener("click", (event) => {
        if (event.target.closest?.("a[href^='mailto:']")) event.preventDefault();
      }, true);
      window.open = () => null;
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const go = async (path = "/") => {
      await page.goto(`http://${host}:${PORT}${path}`, { waitUntil: "load" });
      await page.locator("#root *").first().waitFor();
      await settle();
    };
    const state = async () => {
      await settle();
      return page.evaluate(() => ({
        gtag: typeof window.gtag,
        clarity: typeof window.clarity,
        gaScripts: document.querySelectorAll("#google-analytics-gtag").length,
        clarityScripts: document.querySelectorAll("#microsoft-clarity-script").length,
        dataLayer: (window.dataLayer ?? []).map((entry) => JSON.parse(JSON.stringify(Array.from(entry)))),
        clarityQueue: (window.clarity?.q ?? []).map((entry) => JSON.parse(JSON.stringify(Array.from(entry)))),
        gaDisabled: window["ga-disable-G-DPEYZ4C8BD"] === true,
        stored: localStorage.getItem("dl-consent"),
        cookies: document.cookie,
        mask: document.body.getAttribute("data-clarity-mask"),
      }));
    };
    const gaLoads = () => requests.filter((entry) => GA_SCRIPT.test(entry.split("/")[0])).length;
    const clarityLoads = () => requests.filter((entry) => CLARITY_SCRIPT.test(entry.split("/")[0])).length;
    const trackerRequests = () => requests.filter((entry) => TRACKER.test(entry));
    const events = (current, name) => current.dataLayer.filter((entry) => entry[0] === "event" && (!name || entry[1] === name));
    const banner = () => page.locator("[data-consent-banner]");
    const dialog = () => page.locator("dialog.consent-dialog");
    const shot = (name) => page.screenshot({ path: shotPath(name) });
    return { context, page, requests, writes, errors, go, state, gaLoads, clarityLoads, trackerRequests, events, banner, dialog, settle, shot };
  };
  const leftoverCookies = [
    { name: "_ga", value: "GA1.1.111.222", domain: ".digitallab.studio", path: "/" },
    { name: "_ga_DPEYZ4C8BD", value: "GS1.1.1", domain: ".digitallab.studio", path: "/" },
    { name: "_clck", value: "abc", domain: ".digitallab.studio", path: "/" },
    { name: "_clsk", value: "def", domain: ".digitallab.studio", path: "/" },
  ];
  const fr = { reject: "Tout refuser", customize: "Personnaliser", accept: "Accepter tout", save: "Enregistrer mes choix", footer: "Gérer les cookies",
    analytics: "Autoriser Google Analytics", recording: "Autoriser Microsoft Clarity", close: "Fermer sans changer" };
  const en = { reject: "Reject all", customize: "Customize", accept: "Accept all", save: "Save my choices", footer: "Cookie settings",
    analytics: "Allow Google Analytics", recording: "Allow Microsoft Clarity", close: "Close without changes" };

  // 1. No choice: nothing optional loads, leftover vendor cookies from earlier visits are removed,
  //    and using the site (estimator, navigation) changes nothing.
  for (const [lang, path, mobile] of [["FR", "/", false], ["EN", "/en/", false], ["FR", "/", true], ["EN", "/en/", true]]) {
    const s = await session({ mobile, cookies: leftoverCookies });
    const copy = lang === "EN" ? en : fr;
    await s.go(path);
    await s.banner().waitFor();
    assert.equal(await s.banner().getAttribute("lang"), lang.toLowerCase());
    for (const label of [copy.reject, copy.customize, copy.accept]) assert.equal(await s.banner().getByRole("button", { name: label, exact: true }).count(), 1);
    const section = s.page.locator(".estimator-home");
    await section.getByRole("group").first().getByRole("button").nth(2).click();
    await s.page.getByRole("button", { name: copy.footer, exact: true }).waitFor();
    const current = await s.state();
    assert.deepEqual([current.gtag, current.clarity, current.gaScripts, current.clarityScripts, current.dataLayer.length, current.stored], ["undefined", "undefined", 0, 0, 0, null]);
    assert.equal(current.cookies, "", "leftover _ga/_clck cookies deleted without consent");
    assert.deepEqual(s.trackerRequests(), []);
    // Equal prominence: reject and accept share size, colours, font and border.
    const style = (label) => s.banner().getByRole("button", { name: label, exact: true }).evaluate((button) => {
      const computed = getComputedStyle(button), box = button.getBoundingClientRect();
      return [computed.backgroundColor, computed.color, computed.fontSize, computed.fontWeight, computed.borderTopWidth, computed.borderTopColor, Math.round(box.height)];
    });
    assert.deepEqual(await style(copy.reject), await style(copy.accept));
    assert.deepEqual(await style(copy.reject), await style(copy.customize));
    const box = await s.banner().boundingBox();
    const viewport = s.page.viewportSize();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height + 1, "banner inside viewport");
    for (const button of await s.banner().getByRole("button").all()) assert.ok((await button.boundingBox()).height >= 44, "touch target");
    assert.ok(await s.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal overflow");
    await s.shot(`${lang}-${mobile ? "390" : "1440"}-banner`);
    assert.deepEqual(s.errors, []);
    rows.push({ case: `no choice ${lang} ${mobile ? "390 mobile" : "1440"}`, ga: 0, clarity: 0, cookies: "deleted", tracker: 0 });
    await s.context.close();
  }
  {
    const s = await session({ width: 320, height: 640, mobile: true });
    await s.go("/");
    await s.banner().waitFor();
    assert.ok(await s.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const box = await s.banner().boundingBox();
    assert.ok(box.y >= 0 && box.y + box.height <= 641);
    await s.shot("FR-320-banner");
    await s.page.getByRole("button", { name: fr.customize, exact: true }).click();
    await s.shot("FR-320-preferences");
    rows.push({ case: "no choice FR 320", fits: "yes" });
    await s.context.close();
  }

  // 2. Refusal: stored, banner gone, nothing optional, also after reload.
  {
    const s = await session({ cookies: leftoverCookies });
    await s.go("/");
    await s.page.getByRole("button", { name: fr.reject, exact: true }).click();
    await s.banner().waitFor({ state: "detached" });
    let current = await s.state();
    assert.deepEqual({ ...JSON.parse(current.stored), date: "d" }, { version: 1, analytics: false, recording: false, date: "d" });
    await s.page.reload({ waitUntil: "load" });
    await s.settle();
    current = await s.state();
    assert.equal(await s.banner().count(), 0);
    assert.deepEqual([current.gtag, current.clarity, s.gaLoads(), s.clarityLoads(), current.cookies], ["undefined", "undefined", 0, 0, ""]);
    assert.deepEqual(s.trackerRequests(), []);
    rows.push({ case: "refuse all", ga: 0, clarity: 0, persisted: "yes" });
    await s.context.close();
  }

  // 3. GA4 only, via Customize (nothing prechecked); keyboard-driven.
  {
    const s = await session();
    await s.go("/");
    await s.page.getByRole("button", { name: fr.customize, exact: true }).focus();
    await s.page.keyboard.press("Enter");
    await s.dialog().waitFor();
    const analytics = s.dialog().getByRole("checkbox", { name: fr.analytics });
    const recording = s.dialog().getByRole("checkbox", { name: fr.recording });
    assert.deepEqual([await analytics.isChecked(), await recording.isChecked()], [false, false], "nothing prechecked");
    assert.ok(await s.dialog().evaluate((dialog) => dialog.contains(document.activeElement)), "focus moved into the dialog");
    await s.shot("FR-1440-preferences");
    // Escape closes without saving anything.
    await s.page.keyboard.press("Escape");
    assert.equal(await s.dialog().evaluate((dialog) => dialog.open), false);
    assert.equal((await s.state()).stored, null);
    await s.page.getByRole("button", { name: fr.customize, exact: true }).click();
    await analytics.focus();
    await s.page.keyboard.press("Space");
    assert.equal(await analytics.isChecked(), true);
    await s.dialog().getByRole("button", { name: fr.save, exact: true }).click();
    await s.banner().waitFor({ state: "detached" });
    let current = await s.state();
    assert.deepEqual([s.gaLoads(), s.clarityLoads(), current.gaScripts, current.clarity], [1, 0, 1, "undefined"]);
    assert.deepEqual(current.dataLayer.find((entry) => entry[0] === "consent"), ["consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
    assert.deepEqual(current.dataLayer.find((entry) => entry[0] === "config")[2], { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    // The page viewed when consent is given is recorded once; nothing earlier is replayed.
    assert.equal(s.events(current, "page_view").length, 1);
    assert.equal(s.events(current).length, 1);
    // Existing event contract with consent, and repair privacy.
    const section = s.page.locator(".estimator-home");
    await section.getByRole("group", { name: "Projet ponctuel", exact: true }).getByRole("button", { name: "Réparer / améliorer un site existant", exact: true }).click();
    await section.locator(".repair-details summary").click();
    const secretUrl = "https://client-private.example/boutique-synthetic-page";
    await section.getByLabel("URL publique du site (facultatif)").fill(secretUrl);
    await section.getByLabel("Description du problème (facultatif)").fill("Synthetic private problem for Jean Dupont");
    await section.getByRole("button", { name: "Demander ce devis", exact: true }).click();
    current = await s.state();
    const quote = s.events(current, "estimator_quote_request");
    assert.equal(quote.length, 1);
    assert.deepEqual(Object.keys(quote[0][2]).sort(), ["content_service", "cta_location", "has_project", "offer"]);
    const payloads = JSON.stringify(current.dataLayer.filter((entry) => entry[1] !== "page_view"));
    for (const secret of ["client-private", "boutique-synthetic-page", "Synthetic private", "Jean Dupont"]) assert.ok(!payloads.includes(secret), secret);
    await s.page.reload({ waitUntil: "load" });
    await s.settle();
    current = await s.state();
    assert.deepEqual([current.gaScripts, s.events(current, "page_view").length, current.clarity, await s.banner().count()], [1, 1, "undefined", 0]);
    rows.push({ case: "GA4 only (keyboard)", ga: 1, clarity: 0, pageView: "1 at consent, 1 after reload", privateText: "absent" });
    await s.context.close();
  }

  // 4. Clarity only: Clarity loads with consent v2 (ads denied) and the page masked; GA4 does not.
  {
    const s = await session();
    await s.go("/en/");
    await s.page.getByRole("button", { name: en.customize, exact: true }).click();
    await s.dialog().getByRole("checkbox", { name: en.recording }).check();
    await s.dialog().getByRole("button", { name: en.save, exact: true }).click();
    await s.banner().waitFor({ state: "detached" });
    const current = await s.state();
    assert.deepEqual([s.clarityLoads(), s.gaLoads(), current.clarityScripts, current.gtag, current.mask], [1, 0, 1, "undefined", "true"]);
    assert.deepEqual(current.clarityQueue, [["consentv2", { ad_Storage: "denied", analytics_Storage: "granted" }]]);
    rows.push({ case: "Clarity only (EN)", ga: 0, clarity: 1, masked: "body", consentv2: "ads denied" });
    await s.context.close();
  }

  // 5. Accept all: both load exactly once, across SPA navigation and a reload; page views per path.
  // 6. Then withdrawal through the footer control: GA4 stops in place, Clarity withdrawal reloads.
  {
    const s = await session();
    await s.go("/");
    await s.page.getByRole("button", { name: fr.accept, exact: true }).click();
    await s.banner().waitFor({ state: "detached" });
    await s.page.locator(".footer-legal-nav").getByRole("link", { name: "Mentions légales" }).click();
    await s.page.waitForURL(/mentions-legales/);
    await s.page.goBack();
    let current = await s.state();
    assert.deepEqual([s.gaLoads(), s.clarityLoads(), current.gaScripts, current.clarityScripts], [1, 1, 1, 1]);
    assert.deepEqual(s.events(current, "page_view").map((entry) => entry[2].page_path), ["/", "/mentions-legales", "/"]);
    await s.page.reload({ waitUntil: "load" });
    await s.settle();
    current = await s.state();
    assert.deepEqual([s.gaLoads(), s.clarityLoads(), current.gaScripts, current.clarityScripts, s.events(current, "page_view").length], [2, 2, 1, 1, 1]);
    rows.push({ case: "accept all", ga: "1 per page load", clarity: "1 per page load", spaNavigation: "no reload of vendors" });

    // Withdraw GA4 only: no reload, no further events, GA cookies deleted, Clarity untouched.
    await s.page.evaluate(() => { document.cookie = "_ga=GA1.1.9.9; path=/; domain=.digitallab.studio"; document.cookie = "_ga_DPEYZ4C8BD=GS1; path=/"; });
    const footer = s.page.getByRole("button", { name: fr.footer, exact: true });
    await footer.focus();
    await s.page.keyboard.press("Enter");
    await s.dialog().waitFor();
    const analytics = s.dialog().getByRole("checkbox", { name: fr.analytics });
    assert.deepEqual([await analytics.isChecked(), await s.dialog().getByRole("checkbox", { name: fr.recording }).isChecked()], [true, true]);
    await analytics.uncheck();
    let navigated = false;
    s.page.once("framenavigated", () => { navigated = true; });
    await s.dialog().getByRole("button", { name: fr.save, exact: true }).click();
    current = await s.state();
    const before = current.dataLayer.length;
    assert.equal(navigated, false, "GA4 withdrawal needs no reload");
    assert.equal(current.gaDisabled, true);
    assert.ok(!/(^|; )_ga/.test(current.cookies), "GA cookies deleted: " + current.cookies);
    assert.deepEqual(current.dataLayer.at(-1), ["consent", "update", { analytics_storage: "denied" }]);
    await s.page.locator(".estimator-home").getByRole("group").first().getByRole("button").nth(3).click();
    await s.page.locator(".estimator-home").getByRole("button", { name: "Demander ce devis", exact: true }).click();
    assert.equal((await s.state()).dataLayer.length, before, "no event after withdrawal");
    assert.deepEqual(JSON.parse((await s.state()).stored).analytics, false);

    // Withdraw Clarity: the page reloads without Clarity; its cookies are erased.
    await s.page.evaluate(() => { document.cookie = "_clck=abc; path=/; domain=.digitallab.studio"; });
    await s.page.getByRole("button", { name: fr.footer, exact: true }).click();
    await s.dialog().getByRole("checkbox", { name: fr.recording }).uncheck();
    const queueBefore = (await s.state()).clarityQueue.length;
    await Promise.all([s.page.waitForEvent("load"), s.dialog().getByRole("button", { name: fr.save, exact: true }).click()]);
    await s.settle();
    current = await s.state();
    assert.deepEqual([current.clarity, current.clarityScripts, current.gtag, await s.banner().count()], ["undefined", 0, "undefined", 0]);
    assert.ok(!/_clck|_clsk|_ga/.test(current.cookies), current.cookies);
    assert.deepEqual({ ...JSON.parse(current.stored), date: "d" }, { version: 1, analytics: false, recording: false, date: "d" });
    assert.equal(s.clarityLoads(), 2, "no Clarity request after the withdrawal reload");
    assert.ok(queueBefore >= 1);
    // Re-consent later works again.
    await s.page.getByRole("button", { name: fr.footer, exact: true }).click();
    await s.dialog().getByRole("button", { name: fr.accept, exact: true }).click();
    current = await s.state();
    assert.deepEqual([current.gaScripts, current.clarityScripts, s.events(current, "page_view").length], [1, 1, 1]);
    assert.deepEqual(s.errors, []);
    rows.push({ case: "withdraw GA4 then Clarity", gaStop: "in place, cookies deleted", clarityStop: "reload, cookies deleted", reconsent: "works" });
    await s.context.close();
  }

  // 7. Invalid, outdated and expired stored choices count as none.
  for (const [label, raw] of [["outdated version", '{"version":0,"analytics":true,"recording":true,"date":"2026-11-01"}'],
    ["expired", '{"version":1,"analytics":true,"recording":true,"date":"2025-01-01"}'], ["tampered", '{"version":1,"analytics":"yes","recording":true,"date":"2026-11-01"}'],
    ["garbage", "not json"]]) {
    const s = await session();
    await s.context.addInitScript((value) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("dl-consent", value); sessionStorage.setItem("seeded", "1"); } }, raw);
    await s.go("/");
    await s.banner().waitFor();
    const current = await s.state();
    assert.deepEqual([current.gtag, current.clarity, s.gaLoads(), s.clarityLoads(), current.stored], ["undefined", "undefined", 0, 0, null], label);
    rows.push({ case: `stored ${label}`, treatedAs: "no consent", removed: "yes" });
    await s.context.close();
  }

  // 8. Hostname guard: Preview shows the UI for review but never loads a vendor; localhost has no UI.
  {
    const s = await session({ host: PREVIEW });
    await s.go("/");
    await s.page.getByRole("button", { name: fr.accept, exact: true }).click();
    const current = await s.state();
    assert.deepEqual([current.gtag, current.clarity, s.gaLoads(), s.clarityLoads()], ["undefined", "undefined", 0, 0]);
    assert.deepEqual(s.trackerRequests(), []);
    await s.context.close();
    const local = await session({ host: "127.0.0.1" });
    await local.go("/");
    assert.equal(await local.banner().count(), 0);
    assert.equal(await local.page.getByRole("button", { name: fr.footer, exact: true }).count(), 0);
    assert.deepEqual(local.trackerRequests(), []);
    await local.context.close();
    rows.push({ case: "Vercel Preview + localhost", vendorRequests: 0, previewUi: "shown for review", localhostUi: "none" });
  }

  // 9. Privacy policy page documents both tools and withdrawal.
  {
    const s = await session();
    await s.go("/politique-de-confidentialite");
    const text = await s.page.locator("main").textContent();
    for (const needle of ["Microsoft Clarity", "Google Analytics", "Gérer les cookies", "_clck", "_ga", "désactivés par défaut",
      "Base légale : votre consentement", "sous-traitant", "Microsoft Ireland Operations Limited", "30 jours", "réclamation à la CNIL", "portabilité"]) {
      assert.ok(text.includes(needle), needle);
    }
    assert.ok(!text.includes("Le site utilise également Google Analytics afin de mesurer"));
    await s.page.locator("#cookies").screenshot({ path: shotPath("FR-privacy-cookies-section") });

    // The banner deep-links to the cookies section (French page, marked with hreflang) and the heading clears the sticky header.
    const bannerLink = s.page.locator("[data-consent-banner] a");
    assert.equal(await bannerLink.getAttribute("href"), "/politique-de-confidentialite#cookies");
    assert.equal(await bannerLink.getAttribute("hreflang"), "fr");
    await Promise.all([s.page.waitForURL(/#cookies$/), bannerLink.click()]);
    await s.page.waitForTimeout(400);
    const top = await s.page.locator("#cookies").evaluate((node) => node.getBoundingClientRect().top);
    assert.ok(top >= 60 && top < 400, `#cookies top after deep link: ${top}`);
    rows.push({ case: "privacy policy", clarity: "documented", withdrawal: "documented" });
    await s.context.close();
  }

  console.table(rows);
  const external = [...externalSeen].filter((hostname) => !TRACKER.test(hostname));
  console.log("Other external hosts requested (aborted):", external.length ? external.join(", ") : "none");
  console.log("Consent UI: no choice/refusal = zero GA4/Clarity, GA4-only, Clarity-only, accept all once, withdrawal (GA in place, Clarity reload), invalid/expired choices, FR/EN 1440/390/320, keyboard, equal prominence, Preview/localhost excluded, privacy policy: PASS");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
