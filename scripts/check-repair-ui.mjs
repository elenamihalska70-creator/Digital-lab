import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";
import { REPAIR_CATEGORIES, REPAIR_QUESTIONS, REPAIR_NEED, REPAIR_TERMS } from "../src/utils/repairDiagnostic.js";

const server = await preview({ preview: { host: "127.0.0.1", port: 4322, strictPort: true } });
let browser;
const results = [];
const artifacts = new URL("../repair-review.local/", import.meta.url);
const baseline = JSON.parse(await readFile(new URL("baseline.json", artifacts), "utf8").catch(() => "[]"));
await mkdir(artifacts, { recursive: true });
try {
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    for (const en of [false, true]) {
      const language = en ? "EN" : "FR";
      console.log("Repair browser", language, viewport.width);
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const writes = [], externalRequests = [], errors = [];
      await context.route("**/*", route => {
        const request = route.request(), url = new URL(request.url());
        if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method() + " " + url.pathname);
        if (url.hostname !== "127.0.0.1") externalRequests.push(request.url());
        if (url.hostname !== "127.0.0.1" || !["GET", "HEAD"].includes(request.method()) || ["image", "media", "font"].includes(request.resourceType())) return route.abort();
        return route.continue();
      });
      await context.routeWebSocket("**/*", socket => socket.close());
      await context.addInitScript(() => {
        window.repairAudit = { opened: [], mailtoAnchors: [], copied: [], events: [] };
        window.gtag = (...args) => window.repairAudit.events.push(args);
        window.open = (url, target, features) => { window.repairAudit.opened.push({ url, target, features }); return null; };
        document.addEventListener("click", event => {
          const link = event.target.closest?.("a[href^='mailto:']");
          if (link) { event.preventDefault(); window.repairAudit.mailtoAnchors.push(link.href); }
        }, true);
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
          writeText: async text => window.repairAudit.copied.push(text),
        } });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("http://127.0.0.1:4322/" + (en ? "en/" : ""), { waitUntil: "domcontentloaded" });
      const section = page.locator(".estimator-home");
      const project = section.getByRole("group", { name: en ? "One-off project" : "Projet ponctuel", exact: true });
      const content = section.getByRole("group", { name: en ? "Social media and video" : "Réseaux sociaux et vidéo", exact: true });
      const need = (fr, english) => project.getByRole("button", { name: en ? english : fr, exact: true }).click();
      const select = async (key, value) => {
        const q = REPAIR_QUESTIONS[key], option = q.options.find(([id]) => id === value);
        const button = section.getByRole("group", { name: q[en ? "en" : "fr"] + (en ? " (required)" : " (requis)"), exact: true }).getByRole("button", { name: option[en ? 2 : 1], exact: true });
        await button.click(); assert.equal(await button.getAttribute("aria-pressed"), "true");
      };
      const result = section.locator(".repair-result");
      const assertResult = async category => {
        assert.equal(await result.locator("h3").textContent(), REPAIR_CATEGORIES[category][en ? "en" : "fr"]);
        const price = { small: 70, comprehensive: 650, technical: null, urgent: null }[category];
        const text = await result.textContent();
        assert.ok(text.includes(price === null ? (en ? "on quote" : "sur devis") : String(price)));
        if (price === null) assert.doesNotMatch(await result.locator("strong").textContent(), /70|650|€/);
        assert.ok(text.includes(REPAIR_TERMS.approval[en ? "en" : "fr"]));
        assert.ok(text.includes(en
          ? "The definitive price is confirmed after diagnosis, before work begins."
          : "Le prix définitif est confirmé après diagnostic, avant le début des travaux."));
        if (category === "small") {
          assert.ok(text.includes(en ? "Indicative starting price for an eligible simple, targeted intervention" : "Prix de départ indicatif pour une intervention simple et ciblée éligible"));
          assert.ok(text.includes(en ? "limited to one hour of agreed work" : "limitée à une heure de travail convenue"));
        }
        if (price === null) assert.ok(text.includes(en ? "request a personalised quote" : "demandez un devis personnalisé"));
        assert.doesNotMatch(text, /business days|jours ouvrés|Estimated timeline|Délai indicatif|[0-9]–[0-9]/);
        assert.ok(!(await section.locator(".unified-result").textContent()).includes(en ? "Complex video" : "Vidéo complexe"));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      };
      const request = section.getByRole("button", { name: en ? "Request this quote" : "Demander ce devis", exact: true });
      const url = section.getByRole("textbox", { name: en ? "Public website URL (optional)" : "URL publique du site (facultatif)", exact: true });
      const description = section.getByRole("textbox", { name: en ? "Problem description (optional)" : "Description du problème (facultatif)", exact: true });
      const assertQuoteCategory = async category => {
        await request.click();
        const text = await page.locator("#quote-email-summary").inputValue();
        assert.ok(text.includes(REPAIR_CATEGORIES[category][en ? "en" : "fr"]));
        assert.ok(text.includes(REPAIR_TERMS[category][en ? "en" : "fr"]));
        assert.doesNotMatch(text, /[0-9]–[0-9] (?:business days|jours ouvrés)/);
        if (REPAIR_CATEGORIES[category].price === null) assert.doesNotMatch(text, /(?:70|650)\s*(?:€|EUR)/);
      };
      await need(REPAIR_NEED, "Repair / improve an existing site");
      await assertResult("technical"); await assertQuoteCategory("technical");
      const diagnostic = section.locator(".repair-diagnostic");
      const details = diagnostic.locator("details");
      const toggle = details.locator("summary");
      assert.equal(await diagnostic.locator('[aria-pressed="true"]').count(), 0);
      assert.equal(await details.getAttribute("open"), null);
      assert.equal(await url.isVisible(), false);
      const collapsedHeight = (await diagnostic.boundingBox()).height;
      const before = baseline.find(row => row.width === viewport.width && row.en === en)?.height;
      if (before) assert.ok(collapsedHeight < before * 0.8, `Expected >=20% reduction: ${collapsedHeight}/${before}`);
      await toggle.focus(); await toggle.press("Enter");
      assert.equal(await url.isVisible(), true);
      const expandedHeight = (await diagnostic.boundingBox()).height;
      assert.ok(expandedHeight > collapsedHeight);
      await toggle.press("Space"); assert.equal(await url.isVisible(), false);
      await toggle.press("Enter");
      for (const [fr, english] of [
        ["Vous êtes :", "You are:"],
      ]) assert.equal(await section.getByRole("group", { name: en ? english : fr, exact: true }).count(), 1);
      for (const suffix of ["priority", "existing", "content-ready", "complexity", "features", "pages", "urgency"]) {
        assert.equal(await section.locator("#estimator-home" + (en ? "-en" : "") + "-" + suffix).count(), 0);
      }
      for (const [key, value] of [["issue", "button"], ["intervention", "targeted"], ["platform", "wordpress"], ["urgency", "normal"]]) await select(key, value);
      await assertResult("technical"); // no cheap price before the targeted scope is confirmed
      await select("scope", "local"); await assertResult("small");
      // Selecting an already-selected answer does not erase the targeted scope.
      await select("issue", "button"); await assertResult("small");
      for (const platform of ["custom", "unknown", "hosted", "wordpress"]) {
        await select("platform", platform); await assertResult(["custom", "unknown"].includes(platform) ? "technical" : "small");
      }
      await select("scope", "sensitive"); await assertResult("technical");
      await select("scope", "uncertain"); await assertResult("technical");
      await select("scope", "local");
      await select("urgency", "soon"); await assertResult("small");
      await select("urgency", "blocking"); await assertResult("urgent");
      await select("intervention", "comprehensive"); await assertResult("urgent");
      assert.equal(await section.getByRole("group", { name: REPAIR_QUESTIONS.scope[en ? "en" : "fr"], exact: true }).count(), 0);
      await select("urgency", "normal"); await assertResult("comprehensive"); await assertQuoteCategory("comprehensive");
      await select("issue", "outage"); await assertResult("urgent"); await assertQuoteCategory("urgent");
      await select("issue", "performance"); await assertResult("comprehensive");
      await select("intervention", "targeted"); await assertResult("technical");
      await select("intervention", "several"); await assertResult("technical");
      await select("intervention", "unsure"); await assertResult("technical");
      await select("issue", "other"); await assertResult("technical");
      await select("issue", "display"); await select("intervention", "targeted");
      await assertResult("technical"); // switching back cleared the stale scope
      await select("scope", "local"); await assertResult("small");
      const publicUrl = "https://example.com/synthetic-repair-" + language;
      const problem = "Synthetic repair description " + language + " — a button overlaps the text.";
      await url.fill(publicUrl); await description.fill(problem);
      const storageBefore = await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)]);
      await url.focus(); assert.equal(await url.evaluate(el => el === document.activeElement), true);
      await url.press("Tab");
      assert.equal(await description.evaluate(el => el === document.activeElement), true);
      const urgencyButton = diagnostic.getByRole("group", { name: REPAIR_QUESTIONS.urgency[en ? "en" : "fr"] + (en ? " (required)" : " (requis)"), exact: true }).getByRole("button").first();
      await urgencyButton.focus();
      assert.equal(await urgencyButton.evaluate(el => el === document.activeElement), true);
      await urgencyButton.press("Enter");
      assert.equal(await urgencyButton.getAttribute("aria-pressed"), "true");
      assert.equal(await url.getAttribute("aria-invalid"), "false");
      assert.ok((await url.getAttribute("aria-describedby")).includes("privacy"));
      assert.ok((await url.boundingBox()).height >= 44);
      // Normal short e-mail auto-open with summary; no private outbound-link anchor is exposed.
      await request.click();
      const summary = page.locator("#quote-email-summary");
      const text = await summary.inputValue();
      assert.ok(text.includes(publicUrl) && text.includes(problem));
      assert.ok(text.includes(en ? "Small intervention" : "Petite intervention"));
      assert.ok(text.includes(en ? "VAT not applicable" : "TVA non applicable"));
      assert.doesNotMatch(text, /Complexity|Complexité|Content :|Contenus :|Features :|Fonctionnalités :/);
      const actions = page.locator(".quote-email-actions");
      assert.equal(await actions.locator("a").count(), 0);
      assert.equal(await actions.getByRole("button").count(), 2);
      await actions.getByRole("button").first().click();
      assert.equal(await page.evaluate(() => window.repairAudit.copied.at(-1)), text);
      await actions.getByRole("button").last().click();
      const opened = await page.evaluate(() => window.repairAudit.opened.at(-1));
      assert.equal(opened.target, "_self"); assert.equal(opened.features, "noopener");
      assert.ok(opened.url.startsWith("mailto:")); assert.ok(opened.url.length <= 1900);
      assert.ok(new URL(opened.url).searchParams.get("body").includes(publicUrl));
      // Safe errors do not echo secrets, and even a re-enabled DOM button cannot bypass validation.
      const openedBefore = await page.evaluate(() => window.repairAudit.opened.length);
      await description.fill("password: synthetic-secret-only");
      assert.equal(await description.getAttribute("aria-invalid"), "true");
      assert.equal(await request.isDisabled(), true);
      await toggle.click();
      assert.equal(await description.isVisible(), false);
      assert.ok((await toggle.textContent()).includes(en ? "Fields need correction" : "Champs à corriger"));
      await toggle.press("Enter");
      assert.ok(!(await section.locator(".repair-error").allTextContents()).join(" ").includes("synthetic-secret-only"));
      await request.evaluate(el => { el.disabled = false; }); await request.click();
      assert.equal(await page.evaluate(() => window.repairAudit.opened.length), openedBefore);
      assert.ok(!(await summary.inputValue()).includes("synthetic-secret-only"));
      await description.fill(problem);
      for (const invalid of ["https://user:pass@example.com", "https://example.com/?token=synthetic", "javascript:alert(1)"]) {
        await url.fill(invalid); assert.equal(await url.getAttribute("aria-invalid"), "true"); assert.equal(await request.isDisabled(), true);
      }
      await url.fill(publicUrl);
      // Long free text follows the unchanged copy + short mailto fallback.
      await description.fill(problem + "é".repeat(1300));
      await request.click(); const longText = await summary.inputValue();
      assert.ok(longText.includes("é".repeat(1300)));
      await actions.getByRole("button").first().click(); assert.equal(await page.evaluate(() => window.repairAudit.copied.at(-1)), longText);
      await actions.getByRole("button").last().click();
      const fallback = await page.evaluate(() => window.repairAudit.opened.at(-1).url);
      assert.ok(fallback.length <= 1900); assert.ok(!fallback.includes("synthetic-repair"));
      await description.fill(problem);
      // Pricing stays separated when combined with a subscription, and repair data stays off other services.
      await content.getByRole("button").nth(1).click();
      await assertResult("small");
      const subscription = section.locator(".estimate-block").filter({ hasText: en ? "Subscription" : "Abonnement" }).first();
      const monthly = await subscription.textContent(); assert.ok(monthly.includes("299") && monthly.includes("390"));
      await need("Créer un site web", "Create a website");
      assert.equal(await section.locator(".repair-diagnostic").count(), 0);
      assert.equal(await subscription.textContent(), monthly);
      const pages = section.getByRole("group", { name: en ? "Website pages" : "Pages du site", exact: true });
      for (const [index, amount] of [390,590,890].entries()) {
        await pages.getByRole("button").nth(index).click();
        assert.ok((await section.locator(".result-metrics strong").first().textContent()).includes(String(amount)));
      }
      await request.click();
      assert.ok(!(await summary.inputValue()).includes(publicUrl));
      assert.ok(!(await summary.inputValue()).includes(problem));
      for (const [fr, english] of [["Optimiser SEO & visibilité", "Optimize SEO & visibility"], ["Ajouter une automatisation", "Add an automation"], ["Créer un chatbot / assistant IA", "Create an AI chatbot / assistant"], ["Créer un MVP ou prototype web", "Create an MVP or web prototype"]]) {
        await need(fr, english);
        assert.equal(await section.locator(".repair-diagnostic").count(), 0);
        assert.equal(await section.getByRole("group", { name: en ? "Desired complexity level" : "Niveau de complexité souhaité", exact: true }).count(), 1);
      }
      await need(REPAIR_NEED, "Repair / improve an existing site");
      await section.locator(".repair-details summary").click();
      assert.equal(await url.inputValue(), publicUrl); assert.equal(await description.inputValue(), problem);
      await assertResult("small");
      // Invalid repair fields do not block or contaminate another service's quote.
      await description.fill("token=synthetic-secret-only");
      await need("Aucun", "None"); assert.equal(await request.isDisabled(), false);
      await request.click(); assert.ok(!(await summary.inputValue()).includes("synthetic-secret-only"));
      await need(REPAIR_NEED, "Repair / improve an existing site");
      await section.locator(".repair-details summary").click();
      await description.fill(problem); await content.getByRole("button").first().click();
      const audit = await page.evaluate(() => window.repairAudit);
      assert.ok(audit.events.some(event => event[1] === "estimator_quote_request"));
      const analytics = JSON.stringify(audit.events);
      for (const privateText of [publicUrl, problem, "synthetic-secret-only"]) {
        assert.ok(!analytics.includes(privateText));
        assert.ok(!JSON.stringify(audit.mailtoAnchors).includes(privateText));
        assert.ok(!JSON.stringify(externalRequests).includes(privateText));
      }
      assert.deepEqual(await page.evaluate(() => [JSON.stringify(localStorage), JSON.stringify(sessionStorage)]), storageBefore);
      assert.deepEqual(writes, []); assert.deepEqual(errors, []);
      for (const control of await diagnostic.locator("button, summary, input, textarea").all()) {
        await control.focus(); await page.waitForTimeout(40);
        const box = await control.boundingBox();
        const header = await page.locator(".navbar").boundingBox();
        assert.ok(box.y >= header.y + header.height + 8, "Focused control covered by header");
        assert.ok(box.height >= 44);
      }
      assert.equal(await section.locator(".repair-email").isVisible(), true);
      results.push({ language, width: viewport.width, before, collapsedHeight, expandedHeight });
      // Hide only the sticky header while capturing long diagnostic elements.
      await page.addStyleTag({ content: "header { visibility: hidden !important; }" });
      // Render evidence, with synthetic text only, in the ignored local review directory.
      await section.locator(".repair-diagnostic").screenshot({ path: new URL(language + "-" + viewport.width + "-questions.png", artifacts).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
      await result.screenshot({ path: new URL(language + "-" + viewport.width + "-result.png", artifacts).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
      results.push({ language, width: viewport.width, categories: "70/650/technical/urgent", switching: "PASS", email: "short+long+copy PASS", privacy: "PASS", errors: errors.length, writes: writes.length });
      await context.close();
    }
  }
  console.table(results);
  await writeFile(new URL("results.json", artifacts), JSON.stringify(results, null, 2));
  console.log("Repair diagnostic FR/EN desktop/mobile, classification, switching, e-mail, accessibility and privacy: PASS");
} finally { await browser?.close(); await server.close(); }
