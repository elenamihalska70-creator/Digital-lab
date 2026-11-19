// DL-PRIVACY-CONSENT-01 browser regression: consent-first GA4 on the built site (run `npm run build`
// first). Microsoft Clarity is disabled for this release: no scenario may request it or define it.
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
  browser = await chromium.launch({
    headless: true,
    args: ["--no-proxy-server", `--host-resolver-rules=MAP ${PROD} 127.0.0.1, MAP ${PREVIEW} 127.0.0.1`],
  });

  const session = async ({ host = PROD, mobile = false, width = mobile ? 390 : 1440, height = mobile ? 844 : 900, cookies = [] } = {}) => {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
    const requests = [], writes = [], errors = [];
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method() + " " + url.hostname);
      if (!LOCAL_HOSTS.includes(url.hostname)) {
        requests.push(url.hostname + url.pathname);
        externalSeen.add(url.hostname);
        return route.abort();
      }
      if (!["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
      if (url.hostname === PREVIEW) {
        // .app is HSTS-preloaded. Keep the browser's HTTPS origin and fulfill
        // it from the local HTTP Vite server without contacting Vercel.
        const localUrl = `http://127.0.0.1:${PORT}${url.pathname}${url.search}`;
        const response = await route.fetch({ url: localUrl, maxRedirects: 0 });
        return route.fulfill({ response });
      }
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
      const origin = host === PREVIEW ? `https://${host}:${PORT}` : `http://${host}:${PORT}`;
      await page.goto(origin + path, { waitUntil: "load" });
      await page.locator("#root header, #root main").first().waitFor();
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
    analytics: "Autoriser Google Analytics", close: "Fermer sans changer" };
  const en = { reject: "Reject all", customize: "Customize", accept: "Accept all", save: "Save my choices", footer: "Cookie settings",
    analytics: "Allow Google Analytics", close: "Close without changes" };
  // Clarity is disabled: the consent UI must not mention it or offer a toggle for it.
  const assertNoClarityOption = async (s) => {
    assert.ok(!/Clarity|session recording|enregistrement de session/i.test(await s.banner().textContent()), "banner mentions no Clarity");
    assert.equal(await s.dialog().getByRole("checkbox", { includeHidden: true }).count(), 1, "one optional category only");
    assert.ok(!/Clarity|session recording|enregistrement de session/i.test(await s.dialog().textContent()), "dialog mentions no Clarity");
  };

  // 1. No choice: nothing optional loads, leftover vendor cookies from earlier visits are removed,
  //    and using the site (estimator, navigation) changes nothing.
  for (const [lang, path, mobile] of [["FR", "/", false], ["EN", "/en/", false], ["FR", "/", true], ["EN", "/en/", true]]) {
    const s = await session({ mobile, cookies: leftoverCookies });
    const copy = lang === "EN" ? en : fr;
    await s.go(path);
    await s.banner().waitFor();
    assert.equal(await s.banner().getAttribute("lang"), lang.toLowerCase());
    for (const label of [copy.reject, copy.customize, copy.accept]) assert.equal(await s.banner().getByRole("button", { name: label, exact: true }).count(), 1);
    await assertNoClarityOption(s);
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
    assert.equal(await analytics.isChecked(), false, "nothing prechecked");
    assert.equal(await s.dialog().getByRole("checkbox").count(), 1, "audience measurement is the only optional category");
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

  // 4. A stored opt-in for session recording (from a Preview review or an earlier build) loads nothing:
  //    Clarity is disabled, its leftover cookies are deleted, and no Clarity toggle is offered (EN).
  {
    const s = await session({ cookies: leftoverCookies.filter((cookie) => cookie.name.startsWith("_cl")) });
    await s.context.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("dl-consent", JSON.stringify({ version: 1, analytics: false, recording: true, date: new Date().toISOString().slice(0, 10) }));
        sessionStorage.setItem("seeded", "1");
      }
    });
    await s.go("/en/");
    const current = await s.state();
    assert.equal(await s.banner().count(), 0, "valid stored choice: no banner");
    assert.deepEqual([s.clarityLoads(), s.gaLoads(), current.clarity, current.clarityScripts, current.gtag, current.cookies], [0, 0, "undefined", 0, "undefined", ""]);
    await s.page.getByRole("button", { name: en.footer, exact: true }).click();
    await s.dialog().waitFor();
    assert.equal(await s.dialog().getByRole("checkbox").count(), 1);
    assert.ok(!/Clarity/.test(await s.dialog().textContent()));
    await s.dialog().getByRole("button", { name: en.save, exact: true }).click();
    assert.equal(JSON.parse((await s.state()).stored).recording, false, "a new save never stores a recording opt-in");
    assert.deepEqual(s.trackerRequests(), []);
    rows.push({ case: "stored Clarity opt-in (EN)", clarity: 0, clarityCookies: "deleted", toggle: "none" });
    await s.context.close();
  }

  // 5. Accept all: GA4 loads exactly once, across SPA navigation and a reload; page views per path. Clarity never.
  //    SPA navigation to retired portal addresses and back: no auth dialog or Clarity.
  // 6. Then withdrawal through the footer control: GA4 stops in place; re-consent works without a reload.
  {
    const s = await session();
    await s.go("/");
    await s.page.getByRole("button", { name: fr.accept, exact: true }).click();
    await s.banner().waitFor({ state: "detached" });
    await s.page.locator(".footer-legal-nav").getByRole("link", { name: "Mentions légales" }).click();
    await s.page.waitForURL(/mentions-legales/);
    await s.page.goBack();
    let current = await s.state();
    assert.deepEqual([s.gaLoads(), s.clarityLoads(), current.gaScripts, current.clarityScripts, current.clarity], [1, 0, 1, 0, "undefined"]);
    assert.deepEqual({ ...JSON.parse(current.stored), date: "d" }, { version: 1, analytics: true, recording: false, date: "d" });
    assert.deepEqual(s.events(current, "page_view").map((entry) => entry[2].page_path), ["/", "/mentions-legales", "/"]);
    // Public -> private in-app navigation, exactly as the App's own popstate handler receives it.
    for (const privatePath of ["/dashboard", "/admin", "/espace-client", "/login"]) {
      await s.page.evaluate((path) => { history.pushState({}, "", path); dispatchEvent(new PopStateEvent("popstate")); }, privatePath);
      await s.page.getByRole("heading", { name: "L’espace client n’est plus accessible en ligne" }).waitFor();
      assert.equal(await s.page.locator(".auth-modal").count(), 0, privatePath);
      await s.settle();
      current = await s.state();
      assert.deepEqual([s.clarityLoads(), current.clarity, current.clarityScripts], [0, "undefined", 0], privatePath);
      await s.page.goBack();
      await s.page.waitForURL((url) => !/^\/(login|dashboard|admin|espace-client)$/.test(url.pathname));
    }
    await s.page.reload({ waitUntil: "load" });
    await s.settle();
    current = await s.state();
    assert.deepEqual([s.gaLoads(), s.clarityLoads(), current.gaScripts, current.clarityScripts, s.events(current, "page_view").length], [2, 0, 1, 0, 1]);
    rows.push({ case: "accept all + retired portal SPA routes", ga: "1 per page load", clarity: 0 });

    // Withdraw GA4: no reload, no further events, GA cookies deleted.
    await s.page.evaluate(() => { document.cookie = "_ga=GA1.1.9.9; path=/; domain=.digitallab.studio"; document.cookie = "_ga_DPEYZ4C8BD=GS1; path=/"; });
    const footer = s.page.getByRole("button", { name: fr.footer, exact: true });
    await footer.focus();
    await s.page.keyboard.press("Enter");
    await s.dialog().waitFor();
    const analytics = s.dialog().getByRole("checkbox", { name: fr.analytics });
    assert.equal(await analytics.isChecked(), true);
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

    // Re-consent later works again, in place.
    await s.page.getByRole("button", { name: fr.footer, exact: true }).click();
    await s.dialog().getByRole("button", { name: fr.accept, exact: true }).click();
    current = await s.state();
    assert.deepEqual([current.gaScripts, current.gaDisabled, current.clarityScripts, s.clarityLoads()], [1, false, 0, 0]);
    assert.deepEqual(current.dataLayer.filter((entry) => entry[0] === "consent").at(-1), ["consent", "update", { analytics_storage: "granted" }]);
    assert.equal(s.events(current, "page_view").length, 2, "one page view at load, one at re-consent");
    assert.deepEqual(s.errors, []);
    rows.push({ case: "withdraw GA4, re-consent", gaStop: "in place, cookies deleted", reconsent: "in place", clarity: 0 });
    await s.context.close();
  }

  // 6b. Sign-in return with Supabase tokens in the address (implicit flow): even with GA4 consent, nothing
  //     is loaded or sent on that page load, the GA cookies are kept, and GA4 starts on the next clean load.
  {
    const s = await session({ cookies: leftoverCookies.filter((cookie) => cookie.name.startsWith("_ga")) });
    await s.context.addInitScript(() => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("dl-consent", JSON.stringify({ version: 1, analytics: true, recording: false, date: new Date().toISOString().slice(0, 10) }));
        sessionStorage.setItem("seeded", "1");
      }
    });
    await s.go("/#access_token=synthetic-access&expires_in=3600&refresh_token=synthetic-refresh&token_type=bearer&type=recovery");
    let current = await s.state();
    assert.deepEqual([s.gaLoads(), current.gtag, current.dataLayer.length, s.clarityLoads()], [0, "undefined", 0, 0]);
    assert.ok(/(^|; )_ga=/.test(current.cookies), "GA cookies kept while deferred");
    await s.page.locator(".footer-legal-nav").getByRole("link", { name: "Mentions légales" }).click();
    await s.page.waitForURL(/mentions-legales/);
    current = await s.state();
    assert.deepEqual([s.gaLoads(), current.dataLayer.length], [0, 0], "still nothing in the same page lifecycle");
    assert.deepEqual(s.trackerRequests(), []);
    await s.go("/");
    current = await s.state();
    assert.equal(s.gaLoads(), 1, "GA4 starts on the next clean page load");
    assert.ok(!JSON.stringify(current.dataLayer).includes("synthetic-"), "no token in any GA4 payload");
    rows.push({ case: "sign-in tokens in URL", ga: "deferred to next clean load", tokensSent: 0 });
    await s.context.close();
  }

  // 6c. GA4 already running when credentials appear in the address during the session (history, hash
  //     and query formats): Google's opt-out flag is raised before the change, our helpers send nothing,
  //     and sending resumes only once the address is clean and consent still holds.
  {
    const s = await session();
    await s.go("/");
    await s.page.getByRole("button", { name: fr.accept, exact: true }).click();
    let current = await s.state();
    assert.deepEqual([s.gaLoads(), current.gaDisabled, s.events(current, "page_view").length], [1, false, 1]);
    const estimator = s.page.locator(".estimator-home");
    await estimator.getByRole("group", { name: "Projet ponctuel", exact: true }).getByRole("button", { name: "Réparer / améliorer un site existant", exact: true }).click();
    // The quote request is the estimator interaction that sends a GA4 event (estimator_quote_request).
    const estimatorClick = () => estimator.getByRole("button", { name: "Demander ce devis", exact: true }).click();
    const quoteEvents = async () => s.events(await s.state(), "estimator_quote_request").length;
    await estimatorClick();
    assert.equal(await quoteEvents(), 1, "control: the quote request sends an event on a clean address");
    for (const [label, makeDirty] of [
      ["pushState fragment", () => history.pushState({}, "", "/#access_token=synthetic-push&refresh_token=synthetic-push&type=recovery")],
      ["replaceState query", () => history.replaceState({}, "", "/?code=synthetic-code")],
      ["hash assignment", () => { location.hash = "refresh_token=synthetic-hash&provider_token=synthetic-hash"; }],
      ["error callback", () => history.pushState({}, "", "/#error=access_denied&error_code=otp_expired&error_description=synthetic-error")],
    ]) {
      const before = (await s.state()).dataLayer.length;
      await s.page.evaluate(makeDirty);
      await s.page.evaluate(() => dispatchEvent(new PopStateEvent("popstate")));
      await estimatorClick();
      current = await s.state();
      assert.equal(current.gaDisabled, true, `${label}: Google opt-out flag raised`);
      assert.equal(current.dataLayer.length, before, `${label}: nothing queued while the address carries credentials`);
      // Clean address again (as Supabase does after reading the session): sending resumes.
      await s.page.evaluate(() => history.replaceState({}, "", "/"));
      current = await s.state();
      assert.equal(current.gaDisabled, false, `${label}: flag lifted on a clean address with consent`);
    }
    await estimatorClick();
    assert.equal(await quoteEvents(), 2, "events resume on a clean address (none were sent while dirty)");
    // Withdrawn consent keeps the flag raised even on a clean address.
    await s.page.getByRole("button", { name: fr.footer, exact: true }).click();
    await s.dialog().getByRole("button", { name: fr.reject, exact: true }).click();
    await s.page.evaluate(() => history.replaceState({}, "", "/"));
    assert.equal((await s.state()).gaDisabled, true, "withdrawn: flag stays raised");
    await s.page.getByRole("button", { name: fr.footer, exact: true }).click();
    await s.dialog().getByRole("button", { name: fr.accept, exact: true }).click();
    assert.equal((await s.state()).gaDisabled, false, "re-consent on a clean address lifts the flag");

    // The public build no longer offers an auth form. Callback credentials still stay out of GA4.
    assert.equal(await s.page.locator(".navbar-auth-state, .auth-modal").count(), 0);
    current = await s.state();
    assert.ok(!JSON.stringify(current.dataLayer).includes("synthetic-"));
    assert.deepEqual([s.clarityLoads(), current.clarity, current.clarityScripts], [0, "undefined", 0]);
    assert.deepEqual(s.errors, []);
    rows.push({ case: "GA4 running + credentials in address", optOutFlag: "raised/lifted", queued: 0, clarity: 0 });
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
    await s.context.addInitScript(() => {
      localStorage.setItem("VITE_ENABLE_LOCAL_PORTAL", "true");
      window.VITE_ENABLE_LOCAL_PORTAL = "true";
    });
    await s.go("/admin?VITE_ENABLE_LOCAL_PORTAL=true");
    await s.page.getByRole("heading", { name: "L’espace client n’est plus accessible en ligne" }).waitFor();
    assert.equal(await s.page.locator(".navbar-auth-state, .auth-modal, main form").count(), 0);
    assert.deepEqual(s.writes, []);
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

  // 9. Privacy policy page documents GA4, withdrawal, rights, and that Clarity is not used.
  {
    const s = await session();
    await s.go("/politique-de-confidentialite");
    const text = await s.page.locator("main").textContent();
    for (const needle of ["Google Analytics", "Gérer les cookies", "_ga", "désactivée par défaut", "Microsoft Clarity n’est pas chargé", "_clck",
      "Base légale : votre consentement", "sous-traitant", "réclamation à la CNIL", "portabilité", "Dernière mise à jour : 17 novembre 2026",
      // DL-PRIVACY-FINAL-01: account data, legal bases, recipients, transfers and retention.
      "Continuer avec Google", "article 6.1.b", "article 6.1.f", "article 6.1.c", "4. Destinataires et hébergement", "Vercel Inc.",
      "Supabase Pte. Ltd", "OVHcloud", "clauses contractuelles types", "Aucune suppression automatique", "12. Google API disclosure",
      // DL-PRIVACY-FINAL-02: verified Supabase region, OVHcloud mailbox, Gmail as an additional recipient.
      "région eu-west-1 (Irlande)", "n’exclut pas que certaines données soient traitées", "boîte de messagerie professionnelle",
      "Google (Gmail)", "peuvent également être acheminés ou copiés",
      // DL-PRIVACY-RELEASE-02: section 8 states the actual retention (kept until deletion, no automatic deletion).
      "à ce jour, jusqu’à leur suppression", "Aucune suppression automatique n’est actuellement en place",
      "sous réserve des obligations légales de conservation",
      // DL-PRIVACY-SIMPLIFY-01: account management under 6.1.b; legitimate interest only for security and follow-up.
      "relève de ces mêmes mesures précontractuelles ou du contrat", "la sécurité des accès et le suivi des échanges",
      "L’ancien espace client a été retiré du site public", "Les données déjà enregistrées restent conservées",
      "données d’authentification", "profil et rôle associé", "messages, documents, devis",
      "Pour demander l’accès à ces données, contactez Digital Lab par e-mail"]) {
      assert.ok(text.includes(needle), needle);
    }
    assert.ok(!text.includes("compte client ouvert sans prestation en cours"), "no legitimate interest for account management");
    // No retention promise that is not implemented.
    for (const promise of ["uniquement pendant la durée nécessaire", "conservées pendant la durée de la relation", "3 ans", "10 ans"]) {
      assert.ok(!text.includes(promise), "unimplemented retention promise: " + promise);
    }
    // No overclaim: the region is where the project is deployed, not a guarantee that all processing stays there.
    assert.ok(!/(uniquement|exclusivement) en Irlande/.test(text), "no Ireland-only processing claim");
    for (const stale of ["Enregistrement de session —", "Microsoft Ireland Operations Limited", "30 jours", "recharge la page", "masqués dans Microsoft Clarity",
      "Si vous créez un espace client", "restent consultables dans votre espace client", "la session de votre"]) {
      assert.ok(!text.includes(stale), "stale Clarity text: " + stale);
    }
    assert.ok(!text.includes("Le site utilise également Google Analytics afin de mesurer"));
    assert.ok(!text.includes("Resend"), "Resend has no verified current processing role");
    assert.ok(!/\[[^\]]*(confirmer|à compléter)[^\]]*\]/i.test(text), "no unresolved placeholder on the public page");
    await s.page.locator("#cookies").screenshot({ path: shotPath("FR-privacy-cookies-section") });

    // The banner deep-links to the cookies section (French page, marked with hreflang) and the heading clears the sticky header.
    const bannerLink = s.page.locator("[data-consent-banner] a");
    assert.equal(await bannerLink.getAttribute("href"), "/politique-de-confidentialite#cookies");
    assert.equal(await bannerLink.getAttribute("hreflang"), "fr");
    await Promise.all([s.page.waitForURL(/#cookies$/), bannerLink.click()]);
    await s.page.waitForTimeout(400);
    const top = await s.page.locator("#cookies").evaluate((node) => node.getBoundingClientRect().top);
    assert.ok(top >= 60 && top < 400, `#cookies top after deep link: ${top}`);
    rows.push({ case: "privacy policy", ga: "documented", clarity: "documented as not used", withdrawal: "documented" });

    // Legal notice: the removed public contact form is no longer mentioned.
    await s.go("/mentions-legales");
    const legalText = await s.page.locator("main").textContent();
    assert.ok(!legalText.includes("via un formulaire"), "legal notice: no removed contact form");
    assert.ok(legalText.includes("précédemment transmises via l’ancien espace client"), "legal notice: historical portal records");
    rows.push({ case: "legal notice", contactForm: "not mentioned" });
    await s.context.close();

    // English footer: the policy destination is labelled as French.
    const e = await session();
    await e.go("/en/");
    const footerLink = e.page.locator(".footer-legal-nav a[href='/politique-de-confidentialite']");
    assert.equal((await footerLink.textContent()).trim(), "Privacy policy (in French)");
    assert.equal(await footerLink.getAttribute("hreflang"), "fr");
    rows.push({ case: "EN footer policy link", label: "Privacy policy (in French)", hreflang: "fr" });
    await e.context.close();
  }

  assert.ok(![...externalSeen].some((hostname) => /clarity\.ms/.test(hostname)), "no Clarity request in any scenario");

  console.table(rows);
  const external = [...externalSeen].filter((hostname) => !TRACKER.test(hostname));
  console.log("Other external hosts requested (aborted):", external.length ? external.join(", ") : "none");
  console.log("Consent UI: no choice/refusal = zero GA4, GA4 via keyboard, accept all once, Clarity disabled (no option, stored opt-in ignored, zero requests incl. public→private SPA), sign-in tokens never sent, GA withdrawal/re-consent in place, invalid/expired choices, FR/EN 1440/390/320, equal prominence, Preview/localhost excluded, privacy policy + EN footer label: PASS");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
