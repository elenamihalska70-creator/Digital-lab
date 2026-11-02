// LOT SM-04 — guarded smoke test of the quote request path (estimator → ContactForm
// → contact_requests + /api/send-contact-email) on an isolated Vercel Preview.
//
// Default is a DRY RUN: Supabase and the email API are intercepted, nothing is
// written or sent. A real run needs the owner's approval and every flag below:
//
//   node scripts/quote-request-smoke.mjs --url https://<preview>.vercel.app \
//     --email <test address controlled by the owner> --confirm-real-write \
//     --cases T2 [--bypass-token <Vercel protection bypass secret>]
//
// A real run requires --cases; more than one real request also requires
// --allow-multiple (first test = one request only).
//
// Production domains are always refused. Each request is marked
// "TEST SM-04 — à supprimer" so it can be found and cleaned up afterwards.
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const baseUrl = (option("url") ?? "").replace(/\/+$/, "");
const testEmail = option("email") ?? "";
const realWrite = args.includes("--confirm-real-write");
const bypassToken = option("bypass-token");
const selectedCases = (option("cases") ?? "T1,T2,T3,T4,T5").split(",");
const allowMultiple = args.includes("--allow-multiple");

const PRODUCTION_HOSTS = ["digitallab.studio", "www.digitallab.studio"];
const fail = (message) => {
  console.error(`REFUSED: ${message}`);
  process.exit(2);
};

let host;
try {
  host = new URL(baseUrl).hostname;
} catch {
  fail("--url must be a full URL, e.g. https://<preview>.vercel.app");
}
if (PRODUCTION_HOSTS.includes(host)) fail("production domains are never tested by this script");
if (realWrite && !host.endsWith(".vercel.app")) fail("a real run is only allowed on a *.vercel.app preview");
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) fail("--email must be the owner's test address");
// A real run starts with one explicitly chosen request; the five scenarios need a second, explicit go.
if (realWrite && !option("cases")) fail("a real run needs --cases (start with a single case, e.g. --cases T2)");
if (realWrite && selectedCases.length > 1 && !allowMultiple) fail("more than one real request needs --allow-multiple");

const MARK = "TEST SM-04 — à supprimer";
const pick = (scope, key, label) => scope.locator(`[aria-labelledby$="-${key}"]`).getByRole("button", { name: label, exact: true });

// Expected values come from utils/estimator.js (see docs/LOT-SM-04-RELEASE-REPORT.md).
const cases = {
  T1: { path: "/", estimator: "#estimation", form: "Envoyer ma demande", type: "Site web", expect: ["à partir de 800"], steps: async () => {} },
  T2: {
    path: "/", estimator: "#estimation", form: "Envoyer ma demande", type: "Réseaux sociaux", expect: ["formule Visibilité", "299", "390", "449"],
    steps: async (est) => {
      await pick(est, "project", "Aucun").click();
      await pick(est, "content", "Gestion des réseaux sociaux").click();
      for (const network of ["Instagram", "Facebook"]) await est.locator("label", { hasText: network }).click();
      await est.locator("label", { hasText: "Audit de départ" }).click();
    },
  },
  T3: {
    path: "/", estimator: "#estimation", form: "Envoyer ma demande", type: "Reels", expect: ["Pack 4 Reels", "249"],
    steps: async (est) => {
      await pick(est, "project", "Aucun").click();
      await pick(est, "content", "Reels / vidéos courtes").click();
    },
  },
  T4: {
    path: "/", estimator: "#estimation", form: "Envoyer ma demande", type: "Site web", expect: ["à partir de 800", "formule Croissance", "747", "888", "897"],
    steps: async (est) => {
      await pick(est, "content", "Gestion des réseaux sociaux").click();
      await pick(est, "plan", "Croissance · 549 €/mois").click();
      for (const network of ["Instagram", "Facebook", "LinkedIn"]) await est.locator("label", { hasText: network }).click();
      await pick(est, "extra-reels", "+2").click();
      await est.locator("label", { hasText: "Audit de départ" }).click();
    },
  },
  T5: {
    path: "/en", estimator: "#en-estimation", form: "Send my request", type: "Site web", expect: ["One-off project", "1 Reel", "69"],
    steps: async (est) => {
      await pick(est, "content", "Reels / short videos").click();
      await est.locator('[aria-labelledby$="-reels"] button', { hasText: "1 Reel" }).click();
    },
  },
};

const browser = await chromium.launch();
const report = { mode: realWrite ? "REAL" : "DRY RUN", url: baseUrl, startedAt: new Date().toISOString(), cases: [] };

for (const id of selectedCases) {
  const testCase = cases[id];
  if (!testCase) fail(`unknown case ${id}`);
  const context = await browser.newContext({
    extraHTTPHeaders: bypassToken ? { "x-vercel-protection-bypass": bypassToken, "x-vercel-set-bypass-cookie": "true" } : {},
  });
  const page = await context.newPage();
  const network = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", async (response) => {
    const url = response.url();
    if ((url.includes("/rest/v1/contact_requests") && response.request().method() === "POST") || url.includes("/api/send-contact-email")) {
      const call = { url: url.replace(/\?.*$/, "").replace(/^https?:\/\/[^/]+/, ""), status: response.status() };
      // The email API returns Resend's message id (or its error): keep it to trace the email.
      if (url.includes("/api/send-contact-email")) {
        call.body = await response.text().then((text) => text.slice(0, 300)).catch(() => "");
      }
      network.push(call);
    }
  });
  if (!realWrite) {
    await page.route("**/*", (route) => {
      const request = route.request();
      const url = request.url();
      if (url.includes("/rest/v1/contact_requests") && request.method() === "POST") return route.fulfill({ status: 201, body: "" });
      if (url.includes(".supabase.co")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      if (url.includes("/api/send-contact-email")) return route.fulfill({ status: 200, contentType: "application/json", body: '{"dryRun":true}' });
      return route.continue();
    });
  }

  const result = { id, type: testCase.type, ok: false };
  try {
    await page.goto(`${baseUrl}${testCase.path}`, { waitUntil: "load" });
    const estimator = page.locator(testCase.estimator);
    await estimator.scrollIntoViewIfNeeded();
    await testCase.steps(estimator);
    await estimator.locator(".unified-result .btn").click();
    await page.waitForTimeout(400);
    const summary = (await page.locator(".contact-offer-summary p").innerText()).replace(/\s+/g, " ");
    result.summaryChecks = Object.fromEntries(testCase.expect.map((text) => [text, summary.includes(text)]));
    result.projectType = await page.inputValue("#contact-project-type");
    await page.fill("#contact-name", `${MARK} (${id})`);
    await page.fill("#contact-email", testEmail);
    await page.fill("#contact-company", "TEST SM-04");
    await page.fill("#contact-message", `Demande de test ${id}, ne pas traiter. ${MARK}.`);
    const submittedAt = new Date().toISOString();
    await page.getByRole("button", { name: testCase.form }).click();
    await page.waitForSelector(".contact-form-status", { timeout: 20000 });
    await page.waitForTimeout(1500); // let the email API call finish
    result.submittedAt = submittedAt;
    result.testName = `${MARK} (${id})`;
    result.status = (await page.locator(".contact-form-status").innerText()).trim();
    result.visitorMessageOk = result.status.includes("bien été envoyée") || result.status.includes("has been sent");
    result.screenshot = join(tmpdir(), `quote-smoke-${id}-${Date.now()}.png`);
    await page.locator(".contact-form").screenshot({ path: result.screenshot });
    result.network = network;
    result.pageErrors = errors;
    const dbOk = network.some((call) => call.url.includes("contact_requests") && call.status === 201);
    const emailOk = network.some((call) => call.url.includes("send-contact-email") && call.status === 200);
    result.ok =
      dbOk &&
      emailOk &&
      result.visitorMessageOk &&
      result.projectType === testCase.type &&
      Object.values(result.summaryChecks).every(Boolean) &&
      errors.length === 0;
  } catch (error) {
    result.error = error.message.split("\n")[0];
  }
  report.cases.push(result);
  console.log(
    `${result.ok ? "PASS" : "FAIL"} ${id} — ${JSON.stringify({
      testName: result.testName,
      submittedAt: result.submittedAt,
      type: result.projectType,
      visitorMessage: result.status,
      network: result.network,
      summary: result.summaryChecks,
      screenshot: result.screenshot,
      error: result.error,
    })}`,
  );
  await context.close();
}

await browser.close();
// Written outside the repository so a run never leaves untracked files behind.
const reportPath = join(tmpdir(), `quote-smoke-${realWrite ? "real" : "dry"}-${Date.now()}.json`);
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`${report.mode}: ${report.cases.filter((c) => c.ok).length}/${report.cases.length} cases OK — report ${reportPath}`);
process.exit(report.cases.every((c) => c.ok) ? 0 : 1);
