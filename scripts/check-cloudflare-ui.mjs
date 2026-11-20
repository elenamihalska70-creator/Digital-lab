// Local Pages-style static routing fixture. No requests are sent to Cloudflare or live services.
import assert from "node:assert/strict";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { once } from "node:events";
import { chromium } from "playwright";
import { seoRoutes } from "../seo-routes.config.js";

const production = "https://www.digitallab.studio";
const standby = "https://standby.pages.dev";
const alias = "https://review.standby.pages.dev";
const routes = ["/", ...seoRoutes];
const retired = ["/login", "/dashboard", "/espace-client", "/admin"];
const missing = ["/api/send-contact-email", "/api/send-quote-email", "/unknown-page"];
const live = /^(?:mailto:|tel:)|\/\/[^/]*(?:systeme\.io\/audit-gratuit|audit\.digitallab\.studio)/i;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".mp4": "video/mp4" };
const canonical = path => production + (path === "/en" ? "/en/" : path);

async function serve(directory, artifact) {
  const headers = await readFile(join(directory, "_headers"), "utf8");
  const rules = headers.trim().split("\n");
  assert.deepEqual(rules.slice(0, 4), [
    "https://:project.pages.dev/*", "  X-Robots-Tag: noindex",
    "https://:version.:project.pages.dev/*", "  X-Robots-Tag: noindex",
  ]);
  assert.equal(rules.filter(rule => /x-robots-tag/i.test(rule)).length, 2);
  assert.equal((JSON.parse(await readFile(join(directory, "_standby-artifact.json")))).artifact, artifact);
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    const hostname = req.headers["x-fixture-host"] ?? "";
    if (hostname === new URL(standby).hostname || hostname === new URL(alias).hostname) res.setHeader("X-Robots-Tag", "noindex");
    if (artifact === "TEST") res.setHeader("Content-Security-Policy", "connect-src 'none'; form-action 'none'");
    let file = join(directory, url.pathname, extname(url.pathname) ? "" : "index.html");
    let status = 200;
    let info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      file = join(directory, "404.html");
      info = await stat(file);
      status = 404;
    }
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? "");
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (range) res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
    res.writeHead(range ? 206 : status, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(file, { start, end }).pipe(res);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, local: `http://127.0.0.1:${server.address().port}` };
}

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
try {
  for (const artifact of ["TEST", "FAILOVER"]) {
    const directory = `cloudflare-${artifact}.local`;
    const { server, local } = await serve(directory, artifact);
    try {
      for (const origin of [standby, alias, production]) {
        const headers = { "x-fixture-host": new URL(origin).hostname };
        const home = await fetch(local, { method: "HEAD", headers });
        assert.equal(home.headers.get("x-robots-tag"), origin === production ? null : "noindex");
        for (const path of missing) assert.equal((await fetch(local + path, { method: "HEAD", headers })).status, 404);
      }

      for (const width of [1440, 390]) {
        const blocked = [];
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        await context.addInitScript(() => {
          localStorage.setItem("dl-consent", JSON.stringify({ version: 1, analytics: true, recording: true, date: new Date().toISOString().slice(0, 10) }));
          window.testOpens = [];
          window.open = (...args) => { window.testOpens.push(args[0]); return null; };
          document.addEventListener("click", event => {
            const link = event.target.closest?.('a[href^="mailto:"], a[href^="tel:"]');
            if (link) { window.testOpens.push(link.href); event.preventDefault(); }
          }, true);
        });
        await context.routeWebSocket("**/*", socket => { blocked.push(socket.url()); socket.close(); });
        await context.route("**/*", async route => {
          const request = route.request();
          const url = new URL(request.url());
          if (![standby, production].includes(url.origin) || !["GET", "HEAD"].includes(request.method())) {
            blocked.push(url.href);
            return route.abort();
          }
          if (["image", "font", "media"].includes(request.resourceType())) return route.abort();
          const response = await route.fetch({ url: local + url.pathname + url.search, maxRedirects: 0 });
          return route.fulfill({ response });
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        for (const path of routes) {
          const destination = path === "/en" ? "/en/" : path;
          const html = await (await fetch(local + destination)).text();
          assert.ok(html.includes(`href="${canonical(path)}"`), path);
          assert.ok(html.includes(`href="/#standby-mode"`), path);
          assert.ok(![...html.matchAll(/href="([^"]*)"/g)].some(([, href]) => live.test(href)), path);
          assert.equal((await page.goto(standby + destination, { waitUntil: "domcontentloaded" })).status(), 200);
          assert.equal((await page.reload({ waitUntil: "domcontentloaded" })).status(), 200);
          await page.locator("#standby-mode").waitFor();
          await page.waitForFunction(value => document.querySelector('link[rel="canonical"]').href === value, canonical(path));
          assert.ok(!(await page.locator("a[href]").evaluateAll(links => links.map(link => link.getAttribute("href")))).some(href => live.test(href)), path);
          assert.equal(await page.locator('form:not([method="dialog"])').count(), 0, path);
        }
        for (const path of retired) {
          assert.equal((await page.goto(standby + path)).status(), 200);
          await page.getByRole("heading", { name: "L’espace client n’est plus accessible en ligne" }).waitFor();
          assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
        }
        await page.goto(standby);
        await page.locator(".estimator-home").getByRole("button", { name: "Demander ce devis", exact: true }).click();
        await page.locator("#quote-email-summary").waitFor();
        assert.deepEqual(await page.evaluate(() => window.testOpens), []);
        assert.equal(await page.evaluate(() => typeof window.gtag), "undefined");
        assert.deepEqual(blocked, []);
        assert.deepEqual(errors, []);

        // A mixed-up TEST upload stays inert even on www. FAILOVER activates only there.
        await page.goto(production + "/audit-site-web");
        const direct = page.getByRole("link", { name: /Ouvrir l’application Digital Lab Audit/ });
        assert.equal(await direct.getAttribute("href"), artifact === "TEST" ? "/#standby-mode" : "https://audit.digitallab.studio");
        const hasLiveLinks = (await page.locator("a[href]").evaluateAll(links => links.map(link => link.getAttribute("href")))).some(href => live.test(href));
        assert.equal(hasLiveLinks, artifact === "FAILOVER");
        assert.ok(blocked.every(url => artifact === "FAILOVER" && url.startsWith("https://www.googletagmanager.com/")));
        await context.close();
        console.log(`${artifact} at ${width}px: 14 canonicals and reloads, retired routes, closed submissions, host activation PASS`);
      }

      const video = await browser.newPage();
      try {
        await video.goto(local + "/404.html");
        for (const [name, width, height, duration] of [
          ["AI_Website_Transformation.mp4", 1280, 720, 45.093],
          ["microassist.mp4", 720, 1280, 236.147],
        ]) {
          const metadata = await video.evaluate(async ({ local, name }) => {
            const clip = document.createElement("video");
            clip.muted = true;
            document.body.append(clip);
            clip.src = `${local}/videos/${name}`;
            await clip.play();
            await new Promise(resolve => clip.requestVideoFrameCallback(resolve));
            const result = { width: clip.videoWidth, height: clip.videoHeight, duration: clip.duration };
            clip.pause();
            clip.remove();
            return result;
          }, { local, name });
          assert.deepEqual([metadata.width, metadata.height], [width, height]);
          assert.ok(Math.abs(metadata.duration - duration) < 0.25);
          console.log(`${artifact} ${name}: decoded and played ${metadata.width}×${metadata.height}, ${metadata.duration}s`);
        }
      } finally {
        await video.close();
      }
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
} finally {
  await browser.close();
}
