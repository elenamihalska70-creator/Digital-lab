import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";
import { auditFunnelHref } from "../src/config/auditFunnel.js";

const host = "www.digitallab.studio";
const port = 4362;
const origin = `http://${host}:${port}`;
const eventName = "audit_funnel_cta_click";
const directEvent = "audit_external_app_click";
const server = await preview({ preview: { host: "127.0.0.1", port, strictPort: true, allowedHosts: [host] } });
let browser;

try {
  browser = await chromium.launch({
    executablePath: process.env.AUDIT_TEST_CHROMIUM,
    args: ["--no-proxy-server", `--host-resolver-rules=MAP ${host} 127.0.0.1`],
  });

  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: "reduce",
    });
    await context.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      return url.origin === origin && ["GET", "HEAD"].includes(request.method())
        && (!["image", "media", "font"].includes(request.resourceType()) || url.pathname === "/videos/digitallab-audit-site-web.mp4")
        ? route.continue()
        : route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    const go = async (path = "/") => {
      await page.goto(origin + path);
      await page.locator("header").first().waitFor();
    };
    const auditEvents = () => page.evaluate(({ eventName, directEvent }) =>
      (window.dataLayer ?? []).map((entry) => Array.from(entry))
        .filter(([kind, name]) => kind === "event" && [eventName, directEvent].includes(name)),
    { eventName, directEvent });
    const link = (location) => page.locator(`a[href="${auditFunnelHref(location)}"]`).first();
    const popupClick = async (anchor) => {
      const destination = await anchor.evaluate((element) => element.href);
      const navigation = context.waitForEvent("request", {
        predicate: (request) => request.isNavigationRequest() && request.url() === destination,
      });
      await anchor.click();
      await navigation;
      await Promise.all(context.pages().filter((item) => item !== page).map((item) => item.close()));
    };

    await go();
    for (const location of ["global_nav", "homepage_hero", "homepage_spotlight", "homepage_portfolio", "footer_reminder"]) {
      assert.equal(await link(location).getAttribute("target"), "_blank");
      assert.match(await link(location).getAttribute("rel"), /\bnoreferrer\b/);
      assert.ok((await link(location).textContent()).trim());
    }
    if (mobile) assert.equal(await link("homepage_mobile_sticky").count(), 1);
    await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
    await popupClick(link("homepage_hero"));
    assert.deepEqual(await auditEvents(), []);
    assert.equal(await page.locator("#google-analytics-gtag").count(), 0);
    await page.getByRole("button", { name: "Gérer les cookies", exact: true }).click();
    await page.getByRole("checkbox", { name: "Autoriser Google Analytics" }).check();
    await page.getByRole("button", { name: "Enregistrer mes choix", exact: true }).click();
    await page.locator("#google-analytics-gtag").waitFor({ state: "attached" });
    assert.deepEqual(await auditEvents(), [], "consent grant did not replay the denied click");

    const spotlight = page.locator(".audit-spotlight-section .audit-video-card");
    const video = spotlight.locator("video");
    const play = spotlight.getByRole("button", { name: "Lire l’aperçu vidéo Digital Lab Audit" });
    await play.click();
    await video.evaluate(element => new Promise(resolve => element.requestVideoFrameCallback(resolve)));
    await video.evaluate(element => element.pause());
    await play.click();
    await video.evaluate(element => new Promise(resolve => element.requestVideoFrameCallback(resolve)));
    const plays = await page.evaluate(() => (window.dataLayer ?? []).map(entry => Array.from(entry))
      .filter(([kind, name]) => kind === "event" && name === "audit_video_play"));
    assert.equal(plays.length, 1, "Audit video plays are tracked once per card");
    assert.equal(plays[0][2].cta_location, "homepage_spotlight_video");

    if (mobile) await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await popupClick(link("global_nav"));
    assert.deepEqual(await auditEvents(), [["event", eventName, {
      cta_location: "global_nav",
      destination_type: "systeme_io_funnel",
    }]]);

    await go("/audit-site-web");
    await page.locator(".audit-landing-hero h1").waitFor();
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), "https://www.digitallab.studio/audit-site-web");
    await popupClick(link("audit_landing_primary"));
    const direct = page.getByRole("link", { name: /Ouvrir l’application Digital Lab Audit/ });
    assert.equal(await direct.getAttribute("href"), process.env.VITE_DIGITAL_LAB_AUDIT_URL || "https://audit.digitallab.studio");
    await popupClick(direct);
    assert.deepEqual((await auditEvents()).map(([, name, params]) => [name, params.cta_location]), [
      [eventName, "audit_landing_primary"],
      [directEvent, "audit_landing_direct_app"],
    ]);

    const before = await auditEvents();
    await page.evaluate(() => history.replaceState({}, "", "/audit-site-web?access_token=synthetic-token"));
    await popupClick(link("audit_landing_primary"));
    assert.deepEqual(await auditEvents(), before, "credential-bearing URL suppressed analytics");
    await context.close();
  }

  const context = await browser.newContext();
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin
    && ["GET", "HEAD"].includes(route.request().method())
    && !["image", "media", "font"].includes(route.request().resourceType())
    ? route.continue() : route.abort());
  await context.routeWebSocket("**/*", (socket) => socket.close());
  const page = await context.newPage();
  for (const [path, locations] of [
    ["/en/", ["en_homepage_hero", "homepage_spotlight"]],
    ["/services/creation-site-web", ["creation_hero", "creation_footer"]],
    ["/services/creation-site-web-besancon", ["besancon_hero", "besancon_footer"]],
  ]) {
    await page.goto(origin + path);
    await page.locator("main").waitFor();
    for (const location of locations) {
      await page.locator(`a[href="${auditFunnelHref(location)}"]`).first().waitFor({ state: "attached" });
    }
  }
  await context.close();

  const funnel = new URL(auditFunnelHref("homepage_hero"));
  assert.equal(funnel.origin + funnel.pathname, "https://a59f-contact.systeme.io/audit-gratuit");
  assert.deepEqual(Object.fromEntries(funnel.searchParams), {
    utm_source: "digitallab",
    utm_medium: "website",
    utm_campaign: "audit_gratuit",
    utm_content: "homepage_hero",
  });
  assert.throws(() => auditFunnelHref("person@example.test"), /Unknown audit CTA location/);
  console.log("Audit funnel UI: desktop, mobile, service links, consent, credentials, direct launch and UTM checks passed.");
} finally {
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
