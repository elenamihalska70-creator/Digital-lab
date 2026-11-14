// DL-ESTIMATOR-PRICING-V4 browser regression: explicit packages for SEO, automation,
// chatbot and prototype, on the built site (run `npm run build` first).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";
import { SERVICE_PACKAGES, SERVICE_PACKAGE_TIMING } from "../src/utils/servicePackages.js";

// Independent literals: approved prices and how each must be displayed.
const MATRIX = [
  { index: 3, category: "seo", fr: "Optimiser SEO & visibilité", en: "Optimize SEO & visibility", prices: [[190, "fixed"], [390, "fixed"], [700, "from"]] },
  { index: 4, category: "automation", fr: "Ajouter une automatisation", en: "Add an automation", prices: [[190, "fixed"], [490, "fixed"], [950, "from"]] },
  { index: 5, category: "chatbot", fr: "Créer un chatbot / assistant IA", en: "Create an AI chatbot / assistant", prices: [[390, "fixed"], [790, "fixed"], [null, "quote"]] },
  { index: 6, category: "prototype", fr: "Créer un MVP ou prototype web", en: "Create an MVP or web prototype", prices: [[490, "fixed"], [990, "fixed"], [null, "quote"]] },
];
const TERMS = {
  seo: { fr: "jamais facturé deux fois", en: "never billed twice" },
  automation: { fr: "Outils payants, hébergement, consommation d’IA", en: "Paid tools, hosting, AI usage" },
  chatbot: { fr: "l’absence d’erreur dans les réponses n’est pas garantie", en: "error-free responses are not guaranteed" },
  prototype: { fr: "devis personnalisé", en: "personalized quote" },
};
const normalize = value => String(value ?? "").replaceAll(" ", " ").replaceAll(" ", " ").trim();
// Internal workload hours must never be shown or e-mailed to customers.
const WORKLOAD = /workload|charge (de travail|indicative)|\bheures?\b|\bhours?\b|\d\s*h\b/i;
// The mailto body as the mail app receives it (RFC 6068: CRLF line breaks, UTF-8 percent-encoding).
const mailBody = href => new URLSearchParams(href.slice(href.indexOf("?") + 1)).get("body")?.replace(/\r\n/g, "\n");
const label = ([amount, billing], en) => billing === "quote" ? (en ? "on quote" : "sur devis")
  : (billing === "from" ? (en ? "from " : "dès ") : "") + (en ? "€" + amount : amount + " €");

const out = new URL("../pricing-v4-review.local/", import.meta.url);
await mkdir(out, { recursive: true });
const shot = name => new URL(name + ".png", out).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const server = await preview({ preview: { host: "127.0.0.1", port: 4341, strictPort: true } });
let browser;
const rows = [];
const mailtoLengths = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }, { width: 1686, height: 896 }]) {
    for (const en of [false, true]) {
      const tag = `${en ? "EN" : "FR"}-${viewport.width}`;
      console.log("Checking", tag);
      // Phone widths run as a mobile browser (touch, mobile viewport); desktop widths as desktop.
      const mobile = viewport.width < 500;
      const context = await browser.newContext({ viewport, reducedMotion: "reduce", isMobile: mobile, hasTouch: mobile });
      const writes = [], errors = [];
      await context.route("**/*", route => {
        const request = route.request(), url = new URL(request.url());
        if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method() + " " + url.pathname);
        if (url.hostname !== "127.0.0.1" || !["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
        return route.continue();
      });
      await context.routeWebSocket("**/*", socket => socket.close());
      await context.addInitScript(() => {
        window.packageAudit = { mailto: [], copied: [] };
        document.addEventListener("click", event => {
          const link = event.target.closest?.("a[href^='mailto:']");
          if (link) { event.preventDefault(); window.packageAudit.mailto.push(link.href); }
        }, true);
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async text => { window.packageAudit.copied.push(text); } },
        });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("http://127.0.0.1:4341/" + (en ? "en/" : ""), { waitUntil: "domcontentloaded" });
      const section = page.locator(".estimator-home");
      await section.waitFor();
      const group = (fr, english) => section.getByRole("group", { name: en ? english : fr, exact: true });
      const project = () => group("Projet ponctuel", "One-off project");
      const packages = () => group("Forfait", "Package");
      const compactPrice = () => section.locator(".compact-estimate strong").first().textContent().then(normalize);
      const detailPrice = () => section.locator(".estimate-details-dialog .result-metrics strong").first().textContent().then(normalize);
      const request = section.getByRole("button", { name: en ? "Request this quote" : "Demander ce devis", exact: true });
      const summary = page.locator("#quote-email-summary");
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "horizontal overflow");

      // Stale generic answers that used to add 300 / 650 / features / urgency must never reach a package.
      await project().getByRole("button", { name: en ? "Create a website" : "Créer un site web", exact: true }).click();
      await group("Avez-vous déjà les contenus ?", "Do you already have the content?").getByRole("button").last().click();
      await group("Urgence", "Urgency").getByRole("button", { name: "Urgent", exact: true }).click();
      const payments = section.getByRole("checkbox", { name: en ? "Payments" : "Paiement" });
      await payments.locator("..").click();
      assert.equal(await payments.isChecked(), true);
      const websiteResult = await compactPrice();

      for (const service of MATRIX) {
        await project().getByRole("button").nth(service.index).click();
        assert.equal(await project().getByRole("button").nth(service.index).getAttribute("aria-pressed"), "true");
        // Irrelevant generic questions are hidden; optional context stays.
        for (const [fr, english] of [["Niveau de complexité souhaité", "Desired complexity level"], ["Avez-vous déjà les contenus ?", "Do you already have the content?"], ["Fonctionnalités souhaitées", "Desired features"], ["Urgence", "Urgency"], ["Pages du site", "Website pages"]]) {
          assert.equal(await group(fr, english).count(), 0, `${service.category}: ${fr} must be hidden`);
        }
        assert.equal(await group("Votre priorité principale :", "Your main priority:").count(), 1);
        assert.equal(await group("Avez-vous déjà un site ou un outil existant ?", "Do you already have a site or tool?").count(), 1);
        const buttons = packages().getByRole("button");
        assert.equal(await buttons.count(), 3);
        const config = SERVICE_PACKAGES[service.category].packages;
        for (const [i, price] of service.prices.entries()) {
          const expected = label(price, en);
          const button = buttons.nth(i);
          assert.equal(normalize(await button.textContent()), `${config[i].name[en ? "en" : "fr"]} · ${expected}`);
          if (i === 1) { await button.focus(); await page.keyboard.press("Space"); } else await button.click();
          assert.equal(await button.getAttribute("aria-pressed"), "true");
          assert.equal(await compactPrice(), expected, `${service.category}/${i} compact`);
          assert.equal(await detailPrice(), expected, `${service.category}/${i} details`);
          const scope = section.locator(".package-scope");
          assert.equal(await scope.getByRole("listitem").count(), config[i].includes[en ? "en" : "fr"].length);
          for (const limit of config[i].limits[en ? "en" : "fr"]) assert.ok(normalize(await scope.textContent()).includes(normalize(limit)), limit);
          const question = normalize(await section.locator(".estimator-package").textContent());
          assert.doesNotMatch(question, WORKLOAD, `${service.category}/${i}: workload shown`);
          // Context answers never move the price.
          for (const priority of [1, 4]) {
            await group("Votre priorité principale :", "Your main priority:").getByRole("button").nth(priority).click();
            await group("Avez-vous déjà un site ou un outil existant ?", "Do you already have a site or tool?").getByRole("button").nth(priority % 3).click();
            assert.equal(await compactPrice(), expected);
          }
          const compactText = normalize(await section.locator(".compact-estimate").textContent());
          for (const forbidden of ["440", "560", "à partir de", "jours ouvrés", "business days"]) assert.ok(!compactText.includes(forbidden), `${forbidden} in ${compactText}`);
          assert.doesNotMatch(compactText, WORKLOAD);
        }
        // Full terms in the accessible details dialog.
        await section.locator(".summary-details-button").click();
        const dialog = section.getByRole("dialog");
        await dialog.waitFor({ state: "visible" });
        const dialogText = normalize(await dialog.innerText());
        assert.ok(dialogText.includes(normalize(TERMS[service.category][en ? "en" : "fr"])), service.category + " terms");
        assert.ok(dialogText.includes(en ? "No subscription or recurring fee is ever added automatically" : "Aucun abonnement ni frais récurrent n’est ajouté automatiquement"));
        assert.ok(dialogText.includes(en ? "VAT not applicable" : "TVA non applicable"));
        // No promised deadline: timing is confirmed after assessment. No internal hours.
        const packageBlock = normalize(await dialog.locator(".package-result").innerText());
        assert.ok(packageBlock.includes(SERVICE_PACKAGE_TIMING.value[en ? "en" : "fr"]), packageBlock);
        assert.doesNotMatch(packageBlock, WORKLOAD, packageBlock);
        assert.doesNotMatch(packageBlock, /jours ouvrés|business days|semaines|weeks/);
        assert.ok(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth), "dialog overflow");
        if (["seo", "chatbot"].includes(service.category)) await page.screenshot({ path: shot(`${tag}-${service.category}-details`) });
        await page.keyboard.press("Escape");
        assert.equal(await dialog.isVisible(), false);

        // Quote e-mail for every package: the real encoded mailto: URI opens the mail app with the
        // complete summary, byte-identical to the copyable text (accents, apostrophes, €, spaces).
        for (const [i, price] of service.prices.entries()) {
          const lang = en ? "en" : "fr";
          await buttons.nth(i).click();
          const mailtoCount = await page.evaluate(() => window.packageAudit.mailto.length);
          await request.click();
          assert.equal(await page.evaluate(() => window.packageAudit.mailto.length), mailtoCount + 1, `${service.category}/${i}: the quote must open the mail app with the full summary`);
          const text = await summary.inputValue();
          assert.ok(text.includes(`${en ? "Package" : "Forfait"} : ${config[i].name[lang]} — `), text);
          assert.ok(normalize(text).includes(label(price, en)), `${service.category}/${i} price in e-mail`);
          for (const item of [...config[i].includes[lang], ...config[i].limits[lang], ...SERVICE_PACKAGES[service.category].terms.map(term => term[lang])]) assert.ok(text.includes(item), item);
          assert.ok(text.includes(`${SERVICE_PACKAGE_TIMING.label[lang]} : `));
          assert.ok(text.includes(en ? "VAT not applicable" : "TVA non applicable"));
          assert.ok(!/Complexité|Complexity|Urgence :|Urgency :|Contenus :|Content :/.test(text), text);
          assert.doesNotMatch(text, WORKLOAD, text);
          const mailto = await page.evaluate(() => window.packageAudit.mailto.at(-1));
          assert.ok(mailto.startsWith("mailto:") && mailto.length <= 1900, `${service.category}/${i}: encoded mailto length ${mailto.length}`);
          assert.ok(/%C3%A9/.test(mailto) || en, "accents must be UTF-8 percent-encoded");
          assert.equal(mailBody(mailto), text, `${service.category}/${i}: mail body must equal the summary`);
          mailtoLengths.push(mailto.length);
        }
        await section.scrollIntoViewIfNeeded();
        await section.locator(".estimator-grid").screenshot({ path: shot(`${tag}-${service.category}`) });
        await noOverflow();
      }

      // Combined with Social Media: subscription and first month are unchanged by any package.
      await project().getByRole("button").nth(3).click();
      const content = group("Réseaux sociaux et vidéo", "Social media and video");
      await content.getByRole("button").nth(1).click();
      const firstMonth = () => section.locator(".estimate-block.is-first-month").textContent().then(normalize);
      const before = await firstMonth();
      for (const i of [0, 1, 2]) { await packages().getByRole("button").nth(i).click(); assert.equal(await firstMonth(), before); }

      // Copy/paste fallback: the longest package plus a fully optioned Social Media plan exceeds the
      // mailto limit. Nothing is cut: the mail app is not opened with a truncated text, the panel
      // keeps the complete summary and the copy action copies it verbatim.
      await project().getByRole("button").nth(5).click();
      await packages().getByRole("button").nth(1).click();
      const setCheckbox = async box => { if (!(await box.isChecked())) await box.locator("..").click(); assert.equal(await box.isChecked(), true); };
      for (const box of await group("Réseaux sociaux concernés", "Social networks").getByRole("checkbox").all()) await setCheckbox(box);
      await group("Publications supplémentaires / mois", "Extra posts / month").getByRole("button").last().click();
      await group("Reels supplémentaires / mois", "Extra Reels / month").getByRole("button").last().click();
      await setCheckbox(group("Démarrage", "Getting started").getByRole("checkbox"));
      const opened = await page.evaluate(() => window.packageAudit.mailto.length);
      await request.click();
      assert.equal(await page.evaluate(() => window.packageAudit.mailto.length), opened, "too long: the mail app must not open with a truncated summary");
      const fullText = await summary.inputValue();
      const business = SERVICE_PACKAGES.chatbot.packages[1];
      assert.ok(fullText.includes(`${en ? "Package" : "Forfait"} : ${business.name[en ? "en" : "fr"]} — `));
      assert.ok(normalize(fullText).includes(label([790, "fixed"], en)));
      for (const item of business.includes[en ? "en" : "fr"]) assert.ok(fullText.includes(item), item);
      assert.ok(fullText.includes(en ? "Social media subscription" : "Abonnement réseaux sociaux"));
      const fallbackLink = page.locator(".quote-email-actions a");
      assert.match(await fallbackLink.textContent(), en ? /then paste/ : /puis coller/);
      await fallbackLink.click();
      const shortHref = await page.evaluate(() => window.packageAudit.mailto.at(-1));
      assert.ok(shortHref.length <= 1900 && !mailBody(shortHref).includes(business.name[en ? "en" : "fr"]), "fallback link carries only the short invitation");
      await page.locator(".quote-email-actions button").click();
      assert.equal(await page.evaluate(() => window.packageAudit.copied.at(-1)), fullText, "copy must keep the complete summary");
      if (en && viewport.width === 390) await page.locator(".quote-email-panel").screenshot({ path: shot(`${tag}-fallback`) });
      await content.getByRole("button").nth(0).click();

      // Sticky desktop summary keeps the package price and CTA in view.
      if (viewport.width > 960) {
        const top = await section.locator(".estimator-grid").evaluate(e => e.getBoundingClientRect().top + scrollY);
        await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), top + 200);
        await page.waitForTimeout(300);
        const g = await section.locator(".unified-result").evaluate(e => {
          const header = document.querySelector(".navbar").getBoundingClientRect(), cta = e.querySelector(":scope > .btn-primary").getBoundingClientRect(), price = e.querySelector(".compact-estimate strong").getBoundingClientRect();
          return { position: getComputedStyle(e).position, fits: e.dataset.stickyFits, headerBottom: header.bottom, ctaTop: cta.top, ctaBottom: cta.bottom, priceTop: price.top, priceBottom: price.bottom };
        });
        assert.equal(g.position, "sticky"); assert.equal(g.fits, "true");
        assert.ok(g.priceTop >= g.headerBottom && g.ctaTop >= g.headerBottom && g.ctaBottom <= viewport.height - 8, JSON.stringify(g));
      }

      // Back to the website: its V3 price and stale answers are exactly as before.
      await project().getByRole("button", { name: en ? "Create a website" : "Créer un site web", exact: true }).click();
      assert.equal(await compactPrice(), websiteResult);
      assert.equal(await payments.isChecked(), true);
      await noOverflow();
      assert.deepEqual(writes, []);
      assert.deepEqual(errors, []);
      rows.push({ viewport: tag + "x" + viewport.height, mobile, packages: 12, keyboard: "PASS", staleGeneric: "ignored", hours: "hidden", mailto12: "PASS", maxEncoded: Math.max(...mailtoLengths.splice(0)), fallbackCopy: "PASS", social: "unchanged", sticky: viewport.width > 960 ? "PASS" : "inline", writes: writes.length, errors: errors.length });
      await context.close();
    }
  }
  await writeFile(new URL("results.json", out), JSON.stringify(rows, null, 2));
  console.table(rows);
  console.log("V4 packages UI: FR/EN 1440/390/320/1686 (mobile emulation at 390/320), 12 packages, live price, sur devis, no public hours, timing after assessment, 12 complete encoded mailto e-mails, copy fallback, sticky, no writes/errors: PASS");
} finally {
  await browser?.close();
  await server.close();
}
