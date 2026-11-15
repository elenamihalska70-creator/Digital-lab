// DL-GROWTH-TRACKING-01 browser regression: estimator GA4 events on the built site
// (run `npm run build` first).
//
// The production hostname and a Vercel Preview hostname are mapped to the local preview
// server, so the real production guard (isTrackingAllowed + import.meta.env.PROD) decides.
// Every request leaving the local server is aborted: gtag.js and Clarity never load and
// nothing reaches Google or Microsoft. Events are read from the gtag dataLayer queue.
import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";

const PORT = 4351;
const PROD_HOST = "www.digitallab.studio";
const PREVIEW_HOST = "digital-5ch2zx7fe-elenamihalska70-creators-projects.vercel.app";
const LOCAL_HOSTS = [PROD_HOST, PREVIEW_HOST, "127.0.0.1"];
const ESTIMATOR_PARAMS = ["estimator_variant", "page_language", "service_category", "package_id", "billing_type", "currency"];
const QUOTE_REQUEST_PARAMS = ["offer", "has_project", "content_service", "cta_location"];

const server = await preview({ preview: { host: "127.0.0.1", port: PORT, strictPort: true, allowedHosts: true } });
let browser;
const rows = [];
try {
  browser = await chromium.launch({
    headless: true,
    args: [`--host-resolver-rules=MAP ${PROD_HOST} 127.0.0.1, MAP ${PREVIEW_HOST} 127.0.0.1`],
  });

  const open = async ({ host, path = "/", mobile = false, width = mobile ? 390 : 1440 }) => {
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 900 }, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile,
    });
    const external = [], writes = [], errors = [];
    await context.route("**/*", (route) => {
      const request = route.request(), url = new URL(request.url());
      if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method() + " " + url.hostname);
      if (!LOCAL_HOSTS.includes(url.hostname)) { external.push(url.hostname); return route.abort(); }
      if (!["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
      return route.continue();
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.addInitScript(() => {
      window.trackingAudit = { mailto: [], opened: [] };
      document.addEventListener("click", (event) => {
        const link = event.target.closest?.("a[href^='mailto:']");
        if (link) { event.preventDefault(); window.trackingAudit.mailto.push(link.href); }
      }, true);
      window.open = (href) => { window.trackingAudit.opened.push(String(href)); return null; };
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://${host}:${PORT}${path}`, { waitUntil: "domcontentloaded" });
    await page.locator(".estimator-section").first().waitFor();
    await page.waitForLoadState("load");
    const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // gtag("event", name, params) calls queued by the production shim (gtag.js itself is blocked).
    const events = async () => {
      await settle();
      return page.evaluate(() => (window.dataLayer ?? [])
        .map((entry) => Array.from(entry))
        .filter((entry) => entry[0] === "event")
        .map(([, name, params]) => ({ name, params: JSON.parse(JSON.stringify(params ?? {})) })));
    };
    const named = async (name) => (await events()).filter((event) => event.name === name);
    const press = (locator) => (mobile ? locator.tap() : locator.click());
    return { context, page, external, writes, errors, events, named, press, settle };
  };

  const assertSafePayloads = (all, secrets = []) => {
    // page_view (existing, unchanged) carries the page URL by design; every other event is checked.
    const list = all.filter((event) => event.name !== "page_view");
    const serialized = JSON.stringify(list);
    for (const forbidden of ["@", "http", "€", ...secrets]) assert.ok(!serialized.includes(forbidden), "payload contains " + forbidden);
    for (const { name, params } of list.filter((event) => event.name.startsWith("estimator_") && event.name !== "estimator_quote_request" && event.name !== "estimator_quote_submit")) {
      for (const key of Object.keys(params)) assert.ok(ESTIMATOR_PARAMS.includes(key), `${name}: unexpected ${key}`);
      for (const value of Object.values(params)) assert.match(value, /^[a-z][a-z0-9_]{0,39}$|^EUR$/);
    }
  };

  // 1. Guard: localhost and Vercel Preview never initialize GA4, even with interactions.
  for (const host of ["127.0.0.1", PREVIEW_HOST]) {
    const { context, page, external, errors, press } = await open({ host });
    const section = page.locator(".estimator-home");
    await press(section.getByRole("group", { name: "Projet ponctuel", exact: true }).getByRole("button", { name: "Optimiser SEO & visibilité", exact: true }));
    await press(section.getByRole("group", { name: "Forfait", exact: true }).getByRole("button").nth(1));
    assert.deepEqual(await page.evaluate(() => [typeof window.gtag, typeof window.dataLayer, Boolean(window.__digitalLabGaInitialized)]), ["undefined", "undefined", false]);
    assert.ok(!external.some((hostname) => /google|doubleclick|clarity/.test(hostname)), `${host}: analytics request attempted`);
    assert.equal(await page.evaluate(() => document.cookie), "");
    assert.deepEqual(errors, []);
    rows.push({ case: `guard ${host === PREVIEW_HOST ? "vercel-preview" : "localhost"}`, gtag: "absent", analyticsRequests: 0 });
    await context.close();
  }

  // 2. Production host, main estimator: FR/EN × desktop/mobile.
  let referencePayloads = null;
  for (const mobile of [false, true]) {
    for (const en of [false, true]) {
      const tag = `${en ? "EN" : "FR"}-${mobile ? "390-mobile" : "1440"}`;
      const { context, page, external, writes, errors, events, named, press, settle } = await open({ host: PROD_HOST, path: en ? "/en/" : "/", mobile });
      const t = (fr, english) => (en ? english : fr);
      const section = page.locator(".estimator-home");
      const group = (fr, english) => section.getByRole("group", { name: t(fr, english), exact: true });
      const project = (fr, english) => group("Projet ponctuel", "One-off project").getByRole("button", { name: t(fr, english), exact: true });
      const views = async () => (await named("estimator_price_view")).map(({ params }) => params);

      // The production guard is active: the gtag shim exists and the gtag.js request was blocked.
      assert.equal(await page.evaluate(() => typeof window.gtag), "function");
      assert.ok(external.includes("www.googletagmanager.com"));

      // Page load, visibility, scrolling, resizing and keyboard focus are not interactions.
      await section.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 400);
      await page.setViewportSize({ width: mobile ? 375 : 1280, height: 800 });
      await section.getByRole("button").first().focus();
      await page.keyboard.press("Tab");
      await settle();
      assert.deepEqual((await events()).filter((event) => event.name !== "page_view").map((event) => event.name), [], tag + " passive events");

      // Opening the details dialog is intentional (open) but not a price view.
      await press(section.getByRole("button", { name: t("Voir le détail et les conditions", "View full estimate and terms"), exact: true }));
      await press(page.getByRole("button", { name: t("Fermer le détail", "Close details"), exact: true }));
      assert.equal((await named("estimator_open")).length, 1);
      assert.deepEqual(await views(), []);

      // Re-selecting the selected service and cosmetic answers: no price view.
      for (let index = 0; index < 3; index += 1) await press(project("Créer un site web", "Create a website"));
      await press(group("Vous êtes :", "You are:").getByRole("button").nth(2));
      await press(group("Votre priorité principale :", "Your main priority:").getByRole("button").nth(2));
      assert.deepEqual(await views(), [], tag + " cosmetic");

      // Service and package changes: one event each; repeated clicks do not inflate.
      await press(project("Optimiser SEO & visibilité", "Optimize SEO & visibility"));
      const seoPackages = group("Forfait", "Package").getByRole("button");
      await press(seoPackages.nth(1));
      await press(seoPackages.nth(1));
      await press(seoPackages.nth(1));
      // Keyboard selection counts like a click.
      await seoPackages.nth(2).focus();
      await page.keyboard.press("Space");
      await press(project("Créer un site web", "Create a website")); // back to the passive initial price: counted once
      await press(project("Optimiser SEO & visibilité", "Optimize SEO & visibility")); // remembered SEO package, already counted
      await press(project("Créer un site web", "Create a website")); // website 1 page, already counted
      await press(group("Pages du site", "Website pages").getByRole("button").nth(1));
      await press(group("Réseaux sociaux et vidéo", "Social media and video").getByRole("button", { name: t("Gestion des réseaux sociaux", "Social media management"), exact: true }));
      await press(group("Réseaux sociaux et vidéo", "Social media and video").getByRole("button", { name: t("Aucun", "None"), exact: true })); // removal
      const expected = [
        ["seo", "seo_essential", "fixed"], ["seo", "seo_visibility", "fixed"], ["seo", "seo_development", "from"],
        ["website", "website_1_page", "from"], ["website", "website_3_pages", "from"], ["social_media", "social_visibilite", "monthly"],
      ];
      const viewed = await views();
      assert.deepEqual(viewed.map((view) => [view.service_category, view.package_id, view.billing_type]), expected, tag + " price views");
      for (const view of viewed) assert.deepEqual([view.estimator_variant, view.page_language, view.currency], ["main", en ? "en" : "fr", "EUR"]);

      // Existing CTA contract unchanged: estimator_quote_request = CTA intent; quote_submit = mail app opened.
      await press(section.getByRole("button", { name: t("Demander ce devis", "Request this quote"), exact: true }));
      const quoteRequests = await named("estimator_quote_request");
      assert.equal(quoteRequests.length, 1);
      assert.deepEqual(Object.keys(quoteRequests[0].params).sort(), [...QUOTE_REQUEST_PARAMS].sort());
      assert.deepEqual(quoteRequests[0].params, { offer: "project:Site web", has_project: true, content_service: "none", cta_location: "estimator_home" });
      const mailOpened = (await page.evaluate(() => window.trackingAudit.mailto.length)) > 0;
      assert.equal(mailOpened, true);
      assert.deepEqual((await named("estimator_quote_submit")).map(({ params }) => params), [{ offer: "project:Site web" }]);
      assert.ok((await page.locator("#quote-email-summary").inputValue()).includes("590"));
      assert.equal((await named("estimator_open")).length, 1, tag + " open once");
      assert.equal((await views()).length, expected.length, tag + " CTA adds no price view");

      // Same journey in a separate context gives identical payloads: nothing identifies a visitor.
      const payloads = (await events()).filter((event) => event.name !== "page_view");
      assertSafePayloads(payloads);
      const comparable = JSON.stringify(payloads.map(({ name, params }) => [name, { ...params, page_language: "x" }]));
      if (referencePayloads) assert.equal(comparable, referencePayloads, tag + " payloads differ between visitors");
      referencePayloads ??= comparable;
      assert.equal(await page.evaluate(() => document.cookie), "", "no first-party cookie (gtag.js blocked, none added by the LOT)");
      assert.deepEqual(writes, []);
      assert.deepEqual(errors, []);
      rows.push({ case: tag, open: 1, priceViews: expected.length, quoteRequest: 1, quoteSubmit: 1, passive: 0, repeats: "deduplicated" });
      await context.close();
    }
  }

  // 3. Repair: private URL/description never reach GA4; text typing is not a price view.
  {
    const { context, page, named, press, events, errors } = await open({ host: PROD_HOST });
    const section = page.locator(".estimator-home");
    const secretUrl = "https://client-private.example/admin?token=synthetic-secret-only";
    const problem = "Synthetic private problem description";
    await press(section.getByRole("group", { name: "Projet ponctuel", exact: true }).getByRole("button", { name: "Réparer / améliorer un site existant", exact: true }));
    await section.locator(".repair-details summary").click();
    await section.getByLabel("URL publique du site (facultatif)").fill(secretUrl);
    await section.getByLabel("Description du problème (facultatif)").fill(problem);
    const views = (await named("estimator_price_view")).map(({ params }) => params.package_id);
    assert.deepEqual(views, ["repair_technical"]);
    assertSafePayloads(await events(), ["client-private", "synthetic-secret-only", "Synthetic private", "token"]);
    assert.deepEqual(errors, []);
    rows.push({ case: "repair privacy", priceViews: 1, privateText: "absent" });
    await context.close();
  }

  // 4. Social Media page: CTA presets are passive (existing social_media_offer_select);
  //    choices inside the estimator are variant "social".
  {
    const { context, page, named, events, press, errors } = await open({ host: PROD_HOST, path: "/services/gestion-reseaux-sociaux" });
    const section = page.locator(".estimator-social");
    await page.getByRole("link", { name: "Estimer avec Croissance", exact: true }).click();
    await page.locator(".sm-reels-offer").nth(2).getByRole("link").click();
    assert.equal((await named("social_media_offer_select")).length, 2);
    assert.deepEqual((await named("estimator_open")).length + (await named("estimator_price_view")).length, 0, "preset counted");
    await press(section.getByRole("group", { name: "Réseaux sociaux et vidéo", exact: true }).getByRole("button", { name: "Gestion des réseaux sociaux", exact: true }));
    await press(section.getByRole("group", { name: "Formule", exact: true }).getByRole("button").first());
    const instagram = section.getByRole("checkbox", { name: "Instagram" });
    await instagram.locator("..").click();
    assert.equal(await instagram.isChecked(), true);
    await press(section.getByRole("group", { name: "Réseaux sociaux et vidéo", exact: true }).getByRole("button", { name: "Reels / vidéos courtes", exact: true }));
    await press(section.getByRole("group", { name: "Offre Reels", exact: true }).getByRole("button").nth(3));
    const opens = await named("estimator_open");
    assert.deepEqual(opens.map(({ params }) => params), [{ estimator_variant: "social", page_language: "fr" }]);
    const views = (await named("estimator_price_view")).map(({ params }) => [params.estimator_variant, params.package_id, params.billing_type]);
    // Presets displayed Croissance then Reels pack 8 without counting. Choosing Social Media shows the
    // remembered Croissance plan (a new price on screen), then Présence; Instagram adds no fee for Présence
    // (1 network included); Reels shows the remembered pack 8, then the complex video on quote.
    assert.deepEqual(views, [
      ["social", "social_croissance", "monthly"], ["social", "social_presence", "monthly"], ["social", "reels_8", "monthly"], ["social", "reels_complex", "quote"],
    ]);
    assertSafePayloads(await events());
    assert.deepEqual(errors, []);
    rows.push({ case: "social page", presets: "passive", open: 1, priceViews: views.length });
    await context.close();
  }
  console.table(rows);
  console.log("Estimator tracking UI: guard (localhost, Vercel Preview), FR/EN desktop/mobile, open once, deduplicated price views, passive load/scroll/resize/focus/dialog/presets, unchanged quote events, no private values or visitor identifiers: PASS");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
