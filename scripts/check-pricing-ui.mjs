import assert from "node:assert/strict";
import { preview } from "vite";
import { chromium } from "playwright";
import { WEBSITE_PACKAGES } from "../src/utils/websitePricing.js";

const server = await preview({ preview: { host: "127.0.0.1", port: 4321, strictPort: true } });
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const en of [false, true]) {
      console.log("Checking", en ? "EN" : "FR", viewport.width);
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const forbiddenWrites = [];
      const pageErrors = [];
      await context.route("**/*", route => {
        const request = route.request();
        const url = new URL(request.url());
        if (!["GET", "HEAD"].includes(request.method())) forbiddenWrites.push(request.method() + " " + url.pathname);
        if (url.hostname !== "127.0.0.1" || !["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
        return route.continue();
      });
      await context.routeWebSocket("**/*", socket => socket.close());
      await context.addInitScript(() => {
        window.pricingAudit = { mailto: [], copied: [] };
        document.addEventListener("click", event => {
          const link = event.target.closest?.("a[href^='mailto:']");
          if (link) {
            event.preventDefault();
            window.pricingAudit.mailto.push(link.href);
          }
        }, true);
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: async text => { window.pricingAudit.copied.push(text); } },
        });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", error => pageErrors.push(error.message));
      await page.goto("http://127.0.0.1:4321/" + (en ? "en/" : ""), { waitUntil: "domcontentloaded" });
      const section = page.locator(".estimator-home");
      const group = (fr, english) => section.getByRole("group", { name: en ? english : fr, exact: true });
      const pages = () => group("Pages du site", "Website pages");
      const expectedPrice = amount => (en ? "from €" + new Intl.NumberFormat("en-GB").format(amount) : "à partir de " + new Intl.NumberFormat("fr-FR").format(amount) + " €").replaceAll("\u00a0", " ").replaceAll("\u202f", " ");
      const price = () => section.locator(".result-metrics strong").first().textContent();
      const expectBudget = async amount => {
        await page.waitForFunction(({ expected }) => {
          const actual = document.querySelector(".estimator-home .result-metrics strong")?.textContent.replaceAll("\u00a0", " ").replaceAll("\u202f", " ");
          return actual === expected;
        }, { expected: expectedPrice(amount) });
        assert.equal((await price()).replaceAll("\u00a0", " ").replaceAll("\u202f", " "), expectedPrice(amount));
      };
      const setCheckbox = async (box, checked = true) => {
        if (await box.isChecked() !== checked) await box.locator("..").click();
        assert.equal(await box.isChecked(), checked);
      };
      const pickPages = async count => {
        const index = WEBSITE_PACKAGES.findIndex(pack => pack.pages === count);
        await pages().getByRole("button").nth(index).click();
        assert.equal(await pages().getByRole("button").nth(index).getAttribute("aria-pressed"), "true");
      };
      await expectBudget(390);
      for (const [index, pack] of WEBSITE_PACKAGES.entries()) {
        const label = (await pages().getByRole("button").nth(index).textContent()).replaceAll("\u00a0", " ");
        assert.ok(label.includes(String(pack.price)) && label.includes("€"));
        await pickPages(pack.pages);
        await expectBudget(pack.price);
      }
      console.log("Package labels and selection passed");
      await pickPages(1);
      await expectBudget(390);
      await group("Niveau de complexité souhaité", "Desired complexity level").getByRole("button").first().click();
      await setCheckbox(section.getByRole("checkbox", { name: "SEO" }));
      await setCheckbox(section.getByRole("checkbox", { name: en ? "Contact form" : "Formulaire de contact" }));
      await expectBudget(390);
      await pickPages(3);
      await group("Urgence", "Urgency").getByRole("button", { name: en ? "Fast" : "Rapide", exact: true }).click();
      await expectBudget(649);
      await group("Urgence", "Urgency").getByRole("button", { name: "Normal", exact: true }).click();
      await expectBudget(590);
      const requestButton = section.getByRole("button", { name: en ? "Request this quote" : "Demander ce devis", exact: true });
      console.log("Requesting summary");
      await requestButton.click();
      const summary = page.locator("#quote-email-summary");
      const initialSummary = await summary.inputValue();
      assert.ok(initialSummary.includes(en ? "Website pages (maximum) : 3" : "Pages du site (maximum) : 3"));
      assert.ok(initialSummary.includes("590"));
      assert.ok(initialSummary.includes(en ? "VAT not applicable" : "TVA non applicable"));
      await page.locator(".quote-email-actions button").click();
      assert.equal(await page.evaluate(() => window.pricingAudit.copied.at(-1)), initialSummary);
      await page.locator(".quote-email-actions a").click();
      const initialHref = await page.evaluate(() => window.pricingAudit.mailto.at(-1));
      assert.equal(new URL(initialHref).protocol, "mailto:");
      assert.ok(initialHref.length <= 1900);

      console.log("Short summary/copy/mailto passed");
      await group("Avez-vous déjà les contenus ?", "Do you already have the content?").getByRole("button").last().click();
      await expectBudget(890);
      await setCheckbox(section.getByRole("checkbox", { name: en ? "Payments" : "Paiement" }));
      await expectBudget(1240);
      await group("Niveau de complexité souhaité", "Desired complexity level").getByRole("button").last().click();
      await expectBudget(1890);
      await group("Réseaux sociaux et vidéo", "Social media and video").getByRole("button").nth(1).click();
      await setCheckbox(group("Réseaux sociaux concernés", "Social networks").getByRole("checkbox").nth(0));
      await setCheckbox(group("Réseaux sociaux concernés", "Social networks").getByRole("checkbox").nth(1));
      const monthlyBefore = await section.locator(".estimate-block").filter({ hasText: en ? "Subscription" : "Abonnement" }).first().textContent();
      assert.ok(monthlyBefore.includes("299") && monthlyBefore.includes("390"));
      await pickPages(5);
      await expectBudget(2190);
      const monthlyAfter = await section.locator(".estimate-block").filter({ hasText: en ? "Subscription" : "Abonnement" }).first().textContent();
      assert.equal(monthlyAfter, monthlyBefore);
      await setCheckbox(section.getByRole("checkbox", { name: en ? "Payments" : "Paiement" }), false);
      // Use real maximum add-ons so even the English summary exceeds the mailto limit.
      for (const box of await group("Réseaux sociaux concernés", "Social networks").getByRole("checkbox").all()) await setCheckbox(box);
      await group("Publications supplémentaires / mois", "Extra posts / month").getByRole("button").last().click();
      await group("Reels supplémentaires / mois", "Extra Reels / month").getByRole("button").last().click();
      await setCheckbox(group("Démarrage", "Getting started").getByRole("checkbox"));
      // Make a long, combined summary: fallback must keep every line in the panel.
      for (const box of await group("Fonctionnalités souhaitées", "Desired features").getByRole("checkbox").all()) await setCheckbox(box);
      await group("Urgence", "Urgency").getByRole("button", { name: "Urgent", exact: true }).click();
      await requestButton.click();
      const longSummary = await summary.inputValue();
      assert.ok(longSummary.includes(en ? "Website pages (maximum) : 5" : "Pages du site (maximum) : 5"));
      assert.ok(longSummary.includes(en ? "Social media subscription" : "Abonnement réseaux sociaux"));
      assert.match(await page.locator(".quote-email-actions a").textContent(), en ? /then paste/ : /puis coller/);
      await page.locator(".quote-email-actions a").click();
      const fallbackHref = await page.evaluate(() => window.pricingAudit.mailto.at(-1));
      assert.ok(fallbackHref.length <= 1900);
      await page.locator(".quote-email-actions button").click();
      assert.equal(await page.evaluate(() => window.pricingAudit.copied.at(-1)), longSummary);

      // Leaving website mode hides page count and removes it from future quote summaries.
      await group("Projet ponctuel", "One-off project").getByRole("button").first().click();
      assert.equal(await pages().count(), 0);
      await requestButton.click();
      assert.ok(!(await summary.inputValue()).includes(en ? "Website pages" : "Pages du site"));
      await group("Réseaux sociaux et vidéo", "Social media and video").getByRole("button").last().click();
      assert.ok((await section.locator(".unified-result").textContent()).includes("249"));
      assert.equal(await page.locator("form.contact-form").count(), 0);
      assert.ok((await page.locator(en ? "#en-contact" : "#contact").textContent()).includes(en ? "VAT" : "Contact"));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      assert.deepEqual(forbiddenWrites, []);
      assert.deepEqual(pageErrors, []);
      results.push({ language: en ? "EN" : "FR", width: viewport.width, packages: "390/590/890/back", extras: "649/890/1240/1890/2190", summaryAndCopy: "PASS", fallback: "PASS", recurringUnchanged: "PASS", externalWrites: 0 });
      console.log("Case passed", en ? "EN" : "FR", viewport.width);
      await context.close();
    }
  }
  // Check the production social page: plan/Reels CTA presets and the shared website selector.
  const socialContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const socialWrites = [];
  const socialErrors = [];
  await socialContext.route("**/*", route => {
    const request = route.request();
    if (!["GET", "HEAD"].includes(request.method())) socialWrites.push(request.method());
    if (new URL(request.url()).hostname !== "127.0.0.1" || !["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
    return route.continue();
  });
  await socialContext.routeWebSocket("**/*", socket => socket.close());
  await socialContext.addInitScript(() => document.addEventListener("click", event => {
    if (event.target.closest?.("a[href^='mailto:']")) event.preventDefault();
  }, true));
  const socialPage = await socialContext.newPage();
  socialPage.on("pageerror", error => socialErrors.push(error.message));
  await socialPage.goto("http://127.0.0.1:4321/services/gestion-reseaux-sociaux", { waitUntil: "domcontentloaded" });
  const socialSection = socialPage.locator(".estimator-social");
  await socialSection.waitFor();
  assert.equal(await socialSection.getByRole("group", { name: "Pages du site", exact: true }).count(), 0);
  for (const [name, launch, standard] of [["Présence",149,190],["Visibilité",299,390],["Croissance",549,690]]) {
    await socialPage.getByRole("link", { name: "Estimer avec " + name, exact: true }).click();
    assert.equal(await socialSection.getByRole("group", { name: "Formule", exact: true }).getByRole("button", { name: new RegExp(name) }).getAttribute("aria-pressed"), "true");
    const result = await socialSection.locator(".unified-result").textContent();
    assert.ok(result.includes(String(launch)) && result.includes(String(standard)));
  }
  for (const [index, amount] of [[0,69],[1,249],[2,449]]) {
    await socialPage.locator(".sm-reels-offer").nth(index).getByRole("link").click();
    assert.ok((await socialSection.locator(".unified-result").textContent()).includes(String(amount)));
  }
  await socialPage.locator(".sm-reels-offer").nth(3).getByRole("link").click();
  assert.match(await socialSection.locator(".unified-result").textContent(), /sur devis/);
  await socialPage.locator(".sm-reels-offer").nth(1).getByRole("link").click();
  await socialSection.getByRole("group", { name: "Projet ponctuel", exact: true }).getByRole("button", { name: "Créer un site web", exact: true }).click();
  assert.equal(await socialSection.getByRole("group", { name: "Pages du site", exact: true }).getByRole("button").first().getAttribute("aria-pressed"), "true");
  assert.match(await socialSection.locator(".result-metrics strong").first().textContent(), /390/);
  await socialSection.getByRole("button", { name: "Demander ce devis", exact: true }).click();
  assert.match(await socialPage.locator("#quote-email-summary").inputValue(), /Pages du site \(maximum\) : 1/);
  assert.equal(await socialPage.locator("form.contact-form").count(),0);
  assert.deepEqual(socialWrites,[]);
  assert.deepEqual(socialErrors,[]);
  await socialContext.close();
  console.log("Social page: plan/Reels CTA presets and shared website quote PASS");
  console.table(results);
  console.log("Pricing UI: FR/EN desktop/mobile, CTA, summary/copy/fallback and billing separation PASS");
} finally {
  console.log("Closing browser");
  await browser?.close();
  await server.close();
}
