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

const waitForPlayback = (video) => video.evaluate(element => Promise.race([
  new Promise(resolve => element.requestVideoFrameCallback(() => resolve([element.videoWidth, element.videoHeight]))),
  new Promise((_, reject) => setTimeout(() => reject(new Error("No decoded frame")), 10000)),
]));

async function checkPortfolio(page, origin, mobile, requested) {
  for (const path of ["/", "/en/"]) {
    await page.mouse.move(0, 0);
    await page.goto(origin + path, { waitUntil: "load" });
    const first = page.locator('.project-card video[src="/videos/microassist.mp4"]');
    const second = page.locator('.project-card video[src="/videos/microassist-expert.mp4"]');
    const firstCard = first.locator("xpath=ancestor::article");
    const secondCard = second.locator("xpath=ancestor::article");
    requested.length = 0;
    await first.scrollIntoViewIfNeeded();
    assert.equal(await first.evaluate(video => video.readyState), 0);
    assert.equal(await first.evaluate(video => video.paused), true);
    assert.equal(await first.evaluate(video => getComputedStyle(video).opacity), "0");
    assert.deepEqual(requested, []);

    if (mobile) {
      await firstCard.getByRole("button", { name: await first.getAttribute("aria-label"), exact: true }).tap();
      assert.ok((await waitForPlayback(first)).every(value => value > 0));
      await secondCard.getByRole("button", { name: await second.getAttribute("aria-label"), exact: true }).tap();
      assert.ok((await waitForPlayback(second)).every(value => value > 0));
      assert.deepEqual(await first.evaluate(video => [video.paused, video.currentTime]), [true, 0]);
      assert.equal(await page.locator(".project-card video").evaluateAll(videos => videos.filter(video => !video.paused).length), 1);
    } else {
      await firstCard.locator("h3").hover();
      assert.ok((await waitForPlayback(first)).every(value => value > 0));
      assert.equal(await first.evaluate(video => video.muted), true);
      await page.mouse.move(0, 0);
      await secondCard.evaluate(card => card.scrollIntoView({ block: "center", behavior: "instant" }));
      await secondCard.locator("h3").hover();
      assert.ok((await waitForPlayback(second)).every(value => value > 0));
      assert.equal(await page.locator(".project-card video").evaluateAll(videos => videos.filter(video => !video.paused).length), 1);
      await page.mouse.move(0, 0);
      for (const video of [first, second]) {
        assert.deepEqual(await video.evaluate(element => [element.paused, element.currentTime, element.seeking]), [true, 0, false]);
        assert.ok(await video.getAttribute("poster"));
        await page.waitForFunction(src => getComputedStyle(document.querySelector(`video[src="${src}"]`)).opacity === "0",
          await video.getAttribute("src"));
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      requested.length = 0;
      await firstCard.locator("h3").hover();
      assert.equal(await first.evaluate(video => video.paused), true);
      assert.deepEqual(requested, []);
      await page.emulateMedia({ reducedMotion: "no-preference" });
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
        await checkPortfolio(page, origin, mobile, requested);
        await context.close();
        console.log(`${outDir} ${mobile ? "mobile" : "desktop"}: all 7 posters and clips decoded; no idle downloads; FR/EN portfolio interaction passed`);
      }
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}
