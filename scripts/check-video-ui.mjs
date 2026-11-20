import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";

const samples = [
  ["/", "AI_Website_Transformation.mp4"],
  ["/", "automatisation-communications-web.mp4"],
  ["/audit-site-web", "digitallab-audit-site-web.mp4"],
  ["/projects/microassist", "microassist.mp4"],
  ["/projects/microassist-expert", "microassist-expert.mp4"],
  ["/projects/socle-local", "socle-local.mp4"],
  ["/projects/assistant-reservation-ia", "automatisation.mp4"],
];

const browser = await chromium.launch();
try {
  for (const outDir of ["dist", "cloudflare-TEST.local", "cloudflare-FAILOVER.local"]) {
    const server = await preview({ configFile: false, build: { outDir }, preview: { host: "127.0.0.1", port: 0 } });
    try {
      const origin = new URL(server.resolvedUrls.local[0]).origin;
      for (const mobile of [false, true]) {
        const context = await browser.newContext({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
          isMobile: mobile,
          hasTouch: mobile,
        });
        const requested = [];
        await context.route("**/*", route => {
          const request = route.request();
          const url = new URL(request.url());
          if (url.origin !== origin || !["GET", "HEAD"].includes(request.method())) return route.abort();
          if (url.pathname.endsWith(".mp4")) requested.push(url.pathname);
          return route.continue();
        });
        const page = await context.newPage();
        for (const [path, name] of samples) {
          requested.length = 0;
          await page.goto(origin + path, { waitUntil: "load" });
          const element = page.locator(`video[src="/videos/${name}"]`).first();
          await element.scrollIntoViewIfNeeded();
          if (!mobile) await element.hover();
          assert.equal(await element.getAttribute("preload"), "none");
          assert.equal(await element.getAttribute("autoplay"), null);
          assert.notEqual(await element.getAttribute("poster"), null);
          assert.deepEqual(requested, [], `${name} started loading before playback`);
          const frame = element.evaluate(video => Promise.race([
            new Promise(resolve => video.requestVideoFrameCallback(() => resolve([video.videoWidth, video.videoHeight]))),
            new Promise((_, reject) => setTimeout(() => reject(new Error("No decoded frame")), 10000)),
          ]));
          try {
            if (name === "digitallab-audit-site-web.mp4") {
              await page.getByRole("button", { name: "Lire l’aperçu vidéo Digital Lab Audit" }).first().click();
            } else {
              assert.notEqual(await element.getAttribute("controls"), null);
              await element.evaluate(video => video.play());
            }
            const dimensions = await frame;
            assert.ok(dimensions.every(value => value > 0));
            assert.ok(requested.includes(`/videos/${name}`));
          } finally {
            await frame.catch(() => {});
          }
        }
        await context.close();
        console.log(`${outDir} ${mobile ? "mobile" : "desktop"}: 7 active clips decoded on demand; no initial, viewport or hover downloads`);
      }
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}
