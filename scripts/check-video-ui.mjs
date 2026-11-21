import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
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

const waitForPlayback = (video) => video.evaluate(element => Promise.race([
  new Promise(resolve => element.requestVideoFrameCallback(() => resolve([element.videoWidth, element.videoHeight]))),
  new Promise((_, reject) => setTimeout(() => reject(new Error("No decoded frame")), 10000)),
]));

const previewContexts = [
  ["microassist", '.project-card video[src="/videos/microassist.mp4"]'],
  ["transformation", "#ai-website-transformation-video video"],
  ["audit", ".audit-spotlight-section .audit-video-card video"],
];

async function assertPoster(video, showing) {
  await video.evaluate((element, expected) => new Promise((resolve, reject) => {
    const artwork = element.parentElement.querySelector("img");
    const expires = performance.now() + 3000;
    const check = () => {
      if (artwork?.complete && artwork.naturalWidth &&
          getComputedStyle(artwork).visibility === (expected ? "visible" : "hidden") &&
          getComputedStyle(element).visibility === (expected ? "hidden" : "visible")) {
        resolve();
      } else if (performance.now() > expires) {
        reject(new Error(`Expected ${expected ? "artwork" : "video"} for ${element.currentSrc || element.src}; paused=${element.paused}; video=${getComputedStyle(element).visibility}; artwork=${getComputedStyle(artwork).visibility}`));
      }
      else requestAnimationFrame(check);
    };
    check();
  }), showing);
}

async function checkHomePreviews(page, origin, mobile, requested, screenshots) {
  for (const path of ["/", "/en/"]) {
    await page.goto("about:blank");
    await page.mouse.move(0, 0);
    requested.length = 0;
    await page.goto(origin + path, { waitUntil: "load" });
    let previous;
    for (const [name, selector] of previewContexts) {
      if (!mobile) await page.mouse.move(0, 0);
      const video = page.locator(selector);
      const target = video.locator("..");
      const artwork = video.locator("..").locator("img");
      await artwork.evaluate(element => element.scrollIntoView({block: "center", behavior: "instant"}));
      // Finish reveal and scroll transitions before moving the pointer into the card.
      await target.screenshot({ animations: "disabled" });
      await assertPoster(video, true);
      assert.equal(await video.evaluate(element => element.readyState), 0);
      const shot = screenshots && path === "/" && !mobile ? phase =>
        artwork.locator("..").screenshot({path: join(screenshots, `${name}-${phase}.png`)}) : async () => {};
      await shot("poster");
      if (!previous) assert.deepEqual(requested, []);
      if (mobile) {
        await target.locator(".hover-preview-play").tap();
      } else {
        await target.hover({ position: { x: 16, y: 16 } });
      }
      assert.ok((await waitForPlayback(video)).every(value => value > 0));
      await assertPoster(video, false);
      assert.equal(await video.evaluate(element => element.muted), true);
      assert.equal(await page.locator("video[data-hover-preview]").evaluateAll(videos => videos.filter(element => !element.paused).length), 1);
      if (previous) {
        assert.deepEqual(await previous.evaluate(element => [element.paused, element.currentTime]), [true, 0]);
        await assertPoster(previous, true);
      }
      await shot("playing");
      if (!mobile) {
        await page.mouse.move(0, 0);
        assert.deepEqual(await video.evaluate(element => [element.paused, element.currentTime]), [true, 0]);
        await assertPoster(video, true);
        await shot("reset");
        await page.emulateMedia({ reducedMotion: "reduce" });
        const before = requested.length;
        await target.hover({ position: { x: 16, y: 16 } });
        assert.equal(await video.evaluate(element => element.paused), true);
        assert.equal(requested.length, before);
        await assertPoster(video, true);
        await page.mouse.move(0, 0);
        await page.emulateMedia({ reducedMotion: "no-preference" });
      }
      previous = video;
    }
  }
}

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
          await page.goto("about:blank");
          await page.mouse.move(0, 0);
          requested.length = 0;
          await page.goto(origin + path, { waitUntil: "load" });
          const element = page.locator(`video[src="/videos/${name}"]`).first();
          await element.scrollIntoViewIfNeeded();
          assert.equal(await element.getAttribute("preload"), "none");
          assert.equal(await element.getAttribute("autoplay"), null);
          assert.ok(await element.evaluate(async video => {
            const poster = new Image();
            poster.src = video.poster;
            await poster.decode();
            return poster.naturalWidth;
          }), `${name} poster did not decode`);
          assert.deepEqual(requested, [], `${name} started loading before playback`);
          const frame = waitForPlayback(element);
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
        const screenshots = outDir === "cloudflare-TEST.local" ? process.env.VIDEO_SCREENSHOTS : undefined;
        if (screenshots) await mkdir(screenshots, { recursive: true });
        await checkHomePreviews(page, origin, mobile, requested, screenshots);
        await context.close();
        console.log(`${outDir} ${mobile ? "mobile" : "desktop"}: all 7 posters and clips decoded; no idle downloads; FR/EN portfolio, transformation and Audit interaction passed`);
      }
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}
