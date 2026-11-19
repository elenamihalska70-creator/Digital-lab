// Run against the local production build after npm run build.
import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4363;
const origin = `http://${host}:${port}`;
const server = await preview({
  build: { outDir: process.env.PORTAL_TEST_OUT_DIR || "dist" },
  preview: { host, port, strictPort: true },
});
let browser;

try {
  browser = await chromium.launch();
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const writes = [];
    const backendRequests = [];
    const errors = [];
    await context.addInitScript(() => {
      localStorage.setItem("VITE_ENABLE_LOCAL_PORTAL", "true");
      window.VITE_ENABLE_LOCAL_PORTAL = "true";
      window.DL_LOCAL_PORTAL_DEV_SERVER = true;
      window.portalEnabled = true;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text) => { window.copied = text; } },
      });
      localStorage.setItem("sb-portal-test-auth-token", JSON.stringify({
        access_token: "synthetic",
        refresh_token: "synthetic",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: "synthetic" },
      }));
    });
    await context.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const read = ["GET", "HEAD"].includes(request.method());
      if (!read) writes.push(request.method());
      if (/supabase\.|\/api\//i.test(url.href)) backendRequests.push(url.pathname);
      return read && url.origin === origin && !["image", "media", "font"].includes(request.resourceType())
        ? route.continue()
        : route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => {
      backendRequests.push("websocket");
      socket.close();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    const header = page.locator("header.navbar");
    const burger = header.locator(".navbar-burger");
    const retired = page.getByRole("heading", { name: "L’espace client n’est plus accessible en ligne" });

    await page.goto(origin, { waitUntil: "domcontentloaded" });
    for (const language of ["fr", "en"]) {
      await page.locator("html").getAttribute("lang").then((lang) => assert.equal(lang, language));
      assert.equal(await header.locator(".navbar-auth-state").count(), 0);
      assert.equal(await header.locator("a").count(), 13);
      if (width < 1180) {
        await burger.press("Enter");
        assert.equal(await burger.getAttribute("aria-expanded"), "true");
        await page.keyboard.press("Escape");
        assert.equal(await burger.getAttribute("aria-expanded"), "false");
        await burger.click();
      }
      assert.equal(await header.locator(".navbar-cta").getAttribute("href"), "/#contact");
      const contact = page.locator(".contact-email-card").first();
      const href = await contact.locator(".contact-email-address").getAttribute("href");
      const subject = new URL(href).searchParams.get("subject");
      assert.equal(subject, language === "fr" ? "Demande de projet Digital Lab" : "Digital Lab project inquiry");
      await contact.locator(".contact-email-copy").click();
      assert.equal(await page.evaluate(() => window.copied), "contact@digitallab.studio");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal overflow at ${width}px`);
      if (language === "fr") {
        if (width < 1180 && await burger.getAttribute("aria-expanded") === "false") await burger.click();
        await header.getByRole("link", { name: "English", exact: true }).click();
        await page.waitForURL("**/en/");
        await page.waitForFunction(() => document.documentElement.lang === "en");
      }
    }

    for (const path of ["/login", "/dashboard", "/espace-client", "/admin", "/signup", "/sign-up", "/register", "/ADMIN/", "/login/nested",
      "/login?VITE_ENABLE_LOCAL_PORTAL=true&portalEnabled=true#portalEnabled=true",
      "/dashboard/?code=synthetic#access_token=synthetic"]) {
      await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await retired.waitFor();
      assert.equal(new URL(page.url()).pathname, new URL(path, origin).pathname);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
      assert.equal(await page.locator(".navbar-auth-state, .auth-modal, main form").count(), 0);
      assert.match(await page.getByRole("link", { name: "Contacter Digital Lab", exact: true }).getAttribute("href"), /^mailto:contact@digitallab\.studio\?/);
    }
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await header.waitFor();
    await page.evaluate(() => {
      window.portalEnabled = true;
      localStorage.setItem("portalEnabled", "true");
      history.pushState({}, "", "/admin?VITE_ENABLE_LOCAL_PORTAL=true");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await retired.waitFor();
    assert.equal(await page.locator(".navbar-auth-state, .auth-modal, main form").count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    assert.deepEqual(backendRequests, []);
    await context.close();
    console.log(`Public portal routes, FR/EN navigation and contact at ${width}px: PASS`);
  }
} finally {
  await browser?.close();
  await server.close();
}
