// Local-only carousel regression. External requests and all writes are blocked before navigation.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { preview } from 'vite';
import { chromium } from 'playwright';

await mkdir('validation.local', { recursive: true });
const rows = [];
const browser = await chromium.launch();
try {
  for (const outDir of ['dist', 'cloudflare-TEST.local', 'cloudflare-FAILOVER.local']) {
    const server = await preview({ configFile: false, build: { outDir }, preview: { host: '127.0.0.1', port: 0 } });
    const origin = new URL(server.resolvedUrls.local[0]).origin;
    try {
      for (const width of [1440, 390, 320]) {
        for (const language of ['fr', 'en']) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
          const errors = [], writes = [];
          await context.routeWebSocket('**/*', socket => socket.close());
          await context.route('**/*', route => {
            const request = route.request();
            if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method());
            return new URL(request.url()).origin === origin && ['GET', 'HEAD'].includes(request.method())
              ? route.continue() : route.abort();
          });
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(error.message));
          await page.clock.install();
          await context.addInitScript(() => {
            const originalSet = window.setInterval, originalClear = window.clearInterval;
            window.carouselIntervals = new Map();
            window.setInterval = (callback, delay, ...args) => {
              const id = originalSet(callback, delay, ...args);
              window.carouselIntervals.set(id, { delay, next: Date.now() + delay });
              return id;
            };
            window.clearInterval = id => { window.carouselIntervals.delete(id); return originalClear(id); };
          });
          try {
            await page.goto(origin + (language === 'en' ? '/en/' : '/'), { waitUntil: 'load' });
            await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
            const root = page.locator('.ai-lab-carousel').first();
            await root.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await page.clock.runFor(1000);
            const dots = root.locator('.ai-lab-carousel-dots button');
            const count = await dots.count();
            const index = () => root.locator('.ai-lab-carousel-slide').evaluateAll(slides => slides.findIndex(slide => slide.classList.contains('is-active')));
            const expected = async value => {
              for (let retry = 0; retry < 30 && await index() !== value; retry++) await new Promise(resolve => setTimeout(resolve, 10));
              assert.equal(await index(), value);
              assert.equal(await dots.nth(value).getAttribute('aria-current'), 'true');
              assert.equal(await root.locator('.ai-lab-carousel-slide[aria-hidden="false"]').count(), 1);
            };
            const unfocus = async () => {
              await page.evaluate(() => { window.previousCarouselTimerIds = [...window.carouselIntervals.keys()]; });
              await page.mouse.move(0, 0);
              await page.evaluate(() => document.activeElement?.blur());
              await page.clock.runFor(0);
              await new Promise(resolve => setTimeout(resolve, 30));
            };
            const next = root.locator('.ai-lab-carousel-arrow.is-next');
            await next.focus();
            await next.press('Home');
            await expected(0);
            assert.equal(await root.getAttribute('role'), 'region');
            assert.ok(await root.getAttribute('aria-label'));
            assert.equal(await root.locator('.ai-lab-carousel-slide').first().evaluate(element => getComputedStyle(element).transitionDuration), '0.35s');
            await unfocus();
            const remaining = await page.evaluate(() => {
              const timers = [...window.carouselIntervals.entries()].filter(([id, timer]) => timer.delay === 3750 && !window.previousCarouselTimerIds.includes(id)).map(([, timer]) => timer);
              if (!timers.length) throw new Error('No 3750 ms carousel interval');
              return Math.min(...timers.map(timer => timer.next - Date.now()));
            });
            assert.ok(remaining > 0 && remaining <= 3750);
            await page.clock.runFor(remaining - 1);
            await expected(0);
            await page.clock.runFor(1);
            await expected(1);

            // Real pointer entry is used so React's hover handling is exercised.
            const box = await root.boundingBox();
            await page.mouse.move(box.x + 8, box.y + 8);
            await page.clock.runFor(7500);
            await expected(1);
            await next.click({ force: true });
            await expected(2 % count);
            await root.locator('.ai-lab-carousel-arrow.is-previous').click({ force: true });
            await expected(1);
            await dots.nth(0).click({ force: true });
            await expected(0);
            await dots.nth(0).press('ArrowRight');
            await expected(1);
            await dots.nth(0).press('End');
            await expected(count - 1);
            await dots.nth(0).press('Home');
            await expected(0);
            await page.clock.runFor(7500);
            await expected(0); // Focus suspends autoplay.

            const pause = root.locator('.ai-lab-carousel-pause');
            await pause.click({ force: true });
            assert.equal(await pause.getAttribute('aria-pressed'), 'true');
            await unfocus();
            await page.clock.runFor(7500);
            await expected(0);
            await pause.click({ force: true });
            assert.equal(await pause.getAttribute('aria-pressed'), 'false');
            await unfocus();
            await page.clock.runFor(3750);
            await expected(1);
            await page.clock.resume();
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.ai-lab-carousel .ai-lab-carousel-slide.is-active')).opacity === '1', null, { timeout: 10000 });
            const metrics = await root.evaluate(element => {
              const box = element.getBoundingClientRect();
              const slide = element.querySelector('.is-active');
              const image = slide.querySelector('img');
              return { width: box.width, height: box.height, right: box.right, loaded: image.complete && image.naturalWidth > 0, opacity: getComputedStyle(slide).opacity };
            });
            assert.ok(metrics.width > 0 && metrics.height > 0 && metrics.right <= width + 1);
            assert.ok(metrics.loaded);
            assert.equal(metrics.opacity, '1');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await page.screenshot({ path: `validation.local/carousel-${outDir}-${language}-${width}.png`, fullPage: false });

            await page.emulateMedia({ reducedMotion: 'reduce' });
            await root.locator('.ai-lab-carousel-pause:disabled').waitFor();
            await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10000));
            assert.equal(await pause.isDisabled(), true);
            assert.equal(await root.getAttribute('data-reduced-motion'), 'true');
            const stopped = await index();
            await page.clock.runFor(7500);
            await expected(stopped);
            assert.ok(await root.locator('.ai-lab-carousel-slide').first().evaluate(element => parseFloat(getComputedStyle(element).transitionDuration) <= 0.001));
            await next.click({ force: true });
            await expected((stopped + 1) % count);
            assert.deepEqual(writes, []);
            assert.deepEqual(errors, []);
            rows.push({ outDir, language, width, boundary: '3750ms', autoplay: true, navigation: true, pause: true, reducedMotion: true, responsive: true });
            console.log(`PASS carousel ${outDir} ${language} ${width}`);
          } finally { await context.close(); }
        }
      }
    } finally { await server.close(); }
  }
} finally {
  await browser.close();
  await writeFile('validation.local/carousel-results.json', JSON.stringify(rows, null, 2) + '\n');
}
assert.equal(rows.length, 18);
console.log('PASS 18 carousel scenarios; exact autoplay boundary, hover/focus, arrows/dots/keyboard, pause/resume, reduced motion, image decode and layout');
