// LOT NOTIFY-01A — local end-to-end run. Never connects to Supabase, Vercel or Resend.
//
//   visitor insert (role anon, DB-SEC-01 grants)  →  trigger  →  outbox
//   the frontend's exact call: POST /api/send-contact-email (real route code, real HTTP server)
//   →  worker  →  RPC as service_role  →  real fetch to a FAKE Resend (127.0.0.1)
//   GET /api/cron/notify-reconcile with the cron secret (real route code)
//
// The fake Resend implements the documented idempotency semantics (same key + same payload →
// original response, no new e-mail; same key + other payload → 409 invalid_idempotent_request;
// in-flight → 409 concurrent_idempotent_requests) and can fail, hang or answer 5xx on demand.
// The only stand-in is PostgREST: RPCs run in PGlite as SET ROLE service_role, results serialised
// to JSON as PostgREST does. (A full `supabase start` run needs Docker, not available here.)
//
// Copy this file and notify-01a.model.mjs into a scratch folder, then
//   npm i @electric-sql/pglite@0.2.17 && node --expose-gc notify-01a.e2e.mjs <repo root>
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadModel } from "./notify-01a.model.mjs";

const repo = process.argv[2];
if (!repo) {
  console.error("usage: node --expose-gc notify-01a.e2e.mjs <repo root>");
  process.exit(2);
}
const model = loadModel(repo);
const { N01, N02, N90, N91, prod, api, run, q, formInsert } = model;
const load = (p) => import(pathToFileURL(join(repo, p)).href);
const { createNotifyKickHandler } = await load("api/send-contact-email.js");
const { createNotifyCronHandler } = await load("api/cron/notify-reconcile.js");
const { sendViaResend } = await load("api/_lib/notify/resend.js");
const { NOTIFY_RECIPIENTS } = await load("api/_lib/notify/config.js");

const results = [];
let group = "";
const check = (name, ok, detail = "") => {
  results.push({ ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} ${group} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ───────────────────────────────────────────── fake Resend
const resend = { deliveries: [], keys: new Map(), mode: "ok", hangMs: 0, requests: 0, failNext: 0 };
const fakeResend = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  resend.requests += 1;
  const send = (status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (req.headers.authorization !== "Bearer re_test_not_real") return send(401, { name: "missing_api_key" });
  if (resend.failNext > 0) { resend.failNext -= 1; return send(503, { name: "application_error" }); }
  const key = req.headers["idempotency-key"];
  const hash = createHash("sha256").update(raw).digest("hex");
  const known = resend.keys.get(key);
  if (known) {
    if (known.hash !== hash) return send(409, { name: "invalid_idempotent_request" });
    if (known.inFlight) return send(409, { name: "concurrent_idempotent_requests" });
    return send(200, known.response);
  }
  const entry = { hash, inFlight: true, response: { id: `re_fake_${resend.deliveries.length + 1}` } };
  resend.keys.set(key, entry);
  resend.deliveries.push({ key, payload: JSON.parse(raw) });
  if (resend.hangMs) await sleep(resend.hangMs);
  entry.inFlight = false;
  if (!res.destroyed) send(200, entry.response);
});
await new Promise((resolve) => fakeResend.listen(0, "127.0.0.1", resolve));
const resendUrl = `http://127.0.0.1:${fakeResend.address().port}/emails`;

// ───────────────────────────────────────────── database + PostgREST stand-in
let db = await prod();
const asJson = (value) => JSON.parse(JSON.stringify(value, (k, v) => v));
const toPostgrest = (row) => ({
  ...row,
  request_created_at: row.request_created_at ? new Date(row.request_created_at).toISOString() : null,
  alert_day: row.alert_day instanceof Date ? row.alert_day.toISOString().slice(0, 10) : row.alert_day,
});
const rpc = {
  claim: async (limit) => {
    const r = await api(db, "service_role", null, `select * from public.notify_01a_claim($1)`, [limit]);
    if (!r.ok) throw Object.assign(new Error(r.error), { code: "rpc" });
    return asJson(r.rows.map(toPostgrest));
  },
  mark: async (row, outcome, sha) => {
    const r = await api(db, "service_role", null, `select public.notify_01a_mark($1, $2, $3, $4, $5, $6) as s`,
      [row.outbox_id, row.attempts, outcome.result, outcome.id ?? null, outcome.error ?? null, sha ?? null]);
    if (!r.ok) throw Object.assign(new Error(r.error), { code: "rpc" });
    return r.rows[0].s;
  },
  reconcile: async () => {
    const r = await api(db, "service_role", null, `select public.notify_01a_reconcile() as r`);
    if (!r.ok) throw Object.assign(new Error(r.error), { code: "rpc" });
    return r.rows[0].r;
  },
};

// ───────────────────────────────────────────── the two real routes behind a real HTTP server
const env = {
  VERCEL_ENV: "",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key-not-real",
  VITE_SUPABASE_ANON_KEY: "test-anon-key-not-real",
  RESEND_API_KEY: "re_test_not_real",
  RESEND_FROM_EMAIL: "Digital Lab <notifications@digitallab.studio>",
  NOTIFY_RESEND_API_URL: resendUrl,
  CRON_SECRET: "test-cron-secret-0123456789",
};
let timeoutMs = 2_000;
const send = (args) => sendViaResend({ ...args, timeoutMs });
const kick = createNotifyKickHandler({ env, makeRpc: () => rpc, send });
const cron = createNotifyCronHandler({ env, makeRpc: () => rpc, send });
const logs = [];
const saved = { info: console.info, warn: console.warn, error: console.error };
console.info = console.warn = console.error = (...parts) => logs.push(parts.join(" "));
const app = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  // Vercel-like request / response objects.
  const vreq = { method: req.method, headers: req.headers, get body() { return raw ? JSON.parse(raw) : undefined; } };
  const vres = {
    setHeader: (n, v) => res.setHeader(n, v),
    status(code) { res.statusCode = code; return vres; },
    json(body) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); return vres; },
  };
  const path = new URL(req.url, "http://x").pathname;
  if (path === "/api/send-contact-email") return kick(vreq, vres);
  if (path === "/api/cron/notify-reconcile") return cron(vreq, vres);
  res.statusCode = 404;
  res.end();
});
await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${app.address().port}`;

// The frontend's exact call (src/App.jsx, ContactForm), unchanged.
let ipCounter = 0;
const frontendCall = (contactPayload, ip = `198.51.100.${(ipCounter += 1) % 250}`) => fetch(`${base}/api/send-contact-email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: "http://localhost:5173", "X-Forwarded-For": ip },
  body: JSON.stringify(contactPayload),
});
const cronCall = (secret = env.CRON_SECRET) => fetch(`${base}/api/cron/notify-reconcile`, { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
const submit = async (name, ip) => {
  const fields = { name, email: `${name.toLowerCase().replace(/\W/g, "")}@example.fr`, company: "Atelier", projectType: "Site web", message: `Bonjour, ici ${name}.` };
  const saved = await formInsert(db, "anon", null, { name: fields.name, email: fields.email, company: fields.company, project_type: fields.projectType, message: fields.message });
  if (!saved.ok) throw new Error(saved.error);
  const response = await frontendCall(fields, ip);
  return { response, id: (await q(db, `select id from public.contact_requests where name = $1`, [name]))[0].id };
};
const row = async (requestId) => (await q(db, `select * from notify_01a.outbox where request_id = $1`, [requestId]))[0];
const due = (requestId) => db.exec(`update notify_01a.outbox set next_attempt_at = now() - interval '1 second' where request_id = '${requestId}'`);

try {
  await run(db, N01);
  await run(db, N02);

  group = "[E1 normal]";
  {
    const { response, id } = await submit("Alice Martin");
    check("frontend call answered 202", response.status === 202, String(response.status));
    check("exactly one e-mail delivered", resend.deliveries.length === 1, String(resend.deliveries.length));
    const d = resend.deliveries[0];
    check("to = the two fixed recipients", JSON.stringify(d.payload.to) === JSON.stringify(NOTIFY_RECIPIENTS));
    check("Idempotency-Key = notify-01a/<request id>", d.key === `notify-01a/${id}`);
    check("reply_to = visitor, sender on digitallab.studio", d.payload.reply_to === "alicemartin@example.fr" && d.payload.from === env.RESEND_FROM_EMAIL);
    check("content from the saved request", d.payload.text.includes("Bonjour, ici Alice Martin.") && d.payload.subject.startsWith("Nouvelle demande DL-2026-0001"));
    const r = await row(id);
    check("outbox: sent, resend id stored, payload hash stored", r.status === "sent" && r.resend_id === "re_fake_1" && /^[0-9a-f]{64}$/.test(r.payload_sha256));
  }

  group = "[E2 Resend down]";
  {
    resend.failNext = 1;
    const { id } = await submit("Bruno Petit");
    let r = await row(id);
    check("503 → failed, retry scheduled, nothing delivered", r.status === "failed" && r.last_error === "http_503:application_error" && resend.deliveries.length === 1, `${r.status} ${r.last_error}`);
    await frontendCall({});
    check("an early call does not retry before the backoff", resend.deliveries.length === 1);
    await due(id);
    const c = await cronCall();
    const body = await c.json();
    r = await row(id);
    check("daily cron catches up: sent once", c.status === 200 && r.status === "sent" && resend.deliveries.length === 2 && body.processed.sent === 1, JSON.stringify(body));
  }

  group = "[E3 timeout after delivery]";
  {
    resend.hangMs = 600;
    timeoutMs = 200;
    const { id } = await submit("Chloé Durand");
    let r = await row(id);
    check("timeout → failed (outcome unknown)", r.status === "failed" && r.last_error === "timeout", `${r.status} ${r.last_error}`);
    check("…though Resend did deliver it", resend.deliveries.length === 3);
    await sleep(700);
    resend.hangMs = 0;
    timeoutMs = 2_000;
    await due(id);
    await cronCall();
    r = await row(id);
    check("retry with the same key + same payload → Resend answers the original response, NO second e-mail", r.status === "sent" && resend.deliveries.length === 3 && r.resend_id === "re_fake_3", `${r.status} ${resend.deliveries.length} ${r.resend_id}`);
  }

  group = "[E4 concurrency]";
  {
    resend.hangMs = 150;
    const saved = await formInsert(db, "anon", null, { name: "Damien Roux", email: "damien@example.fr" });
    const id = (await q(db, `select id from public.contact_requests where name = 'Damien Roux'`))[0].id;
    await Promise.all([frontendCall({}, "203.0.113.1"), frontendCall({}, "203.0.113.2"), cronCall(), frontendCall({}, "203.0.113.3")]);
    resend.hangMs = 0;
    check("4 simultaneous calls → one e-mail", saved.ok && resend.deliveries.filter((d) => d.key === `notify-01a/${id}`).length === 1);
    check("…marked sent", (await row(id)).status === "sent");
  }

  group = "[E5 no relay]";
  {
    const before = resend.requests;
    const res = await frontendCall({ to: "attacker@evil.example", email: "attacker@evil.example", subject: "WIN", message: "spam spam", html: "<a href=x>x</a>" });
    check("posting arbitrary content sends nothing (queue empty)", res.status === 202 && resend.requests === before);
    const bad = await fetch(`${base}/api/send-contact-email`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
    check("foreign origin refused", bad.status === 403);
    check("cron without secret → 401", (await cronCall(null)).status === 401);
    check("cron with a wrong secret → 401", (await cronCall("nope-nope-nope-nope")).status === 401);
    check("nothing sent by these calls", resend.requests === before);
  }

  group = "[E6 trigger failure]";
  {
    await db.exec(`alter table notify_01a.outbox add constraint t_fail check (request_id is null) not valid`);
    const { response, id } = await submit("Emma Leroy");
    await db.exec(`alter table notify_01a.outbox drop constraint t_fail`);
    check("visitor saved its request and got the usual answer", response.status === 202 && Boolean(id));
    check("no outbox row yet", !(await row(id)));
    const c = await (await cronCall()).json();
    check("cron reconcile re-enqueues and sends it", c.before.enqueued === 1 && (await row(id)).status === "sent", JSON.stringify(c.before));
  }

  group = "[E7 caps]";
  {
    await db.exec(`update notify_01a.settings set hourly_cap = 7`); // 5 already sent in the last hour
    const before = resend.deliveries.length;
    const ids = [];
    for (const name of ["F1", "F2", "F3", "F4"]) ids.push((await submit(`Cap ${name}`)).id);
    const kinds = resend.deliveries.slice(before).map((d) => (d.key.includes("volume-alert") ? "alert" : "request"));
    check("2 requests sent, then a single volume alert", JSON.stringify(kinds) === JSON.stringify(["request", "request", "alert"]), JSON.stringify(kinds));
    const waiting = (await q(db, `select count(*)::int n from notify_01a.outbox where status = 'pending' and kind = 'new_request'`))[0].n;
    check("the other 2 wait (pending), nothing lost", waiting === 2);
    const alert = resend.deliveries.find((d) => d.key.includes("volume-alert"));
    check("alert to the two recipients, without visitor data", JSON.stringify(alert.payload.to) === JSON.stringify(NOTIFY_RECIPIENTS) && !alert.payload.reply_to && !JSON.stringify(alert.payload).includes("Cap F"));
    await db.exec(`update notify_01a.outbox set sent_at = now() - interval '2 hours' where status = 'sent'`);
    await cronCall();
    check("when capacity returns, the cron sends them", (await q(db, `select count(*)::int n from notify_01a.outbox where status = 'pending'`))[0].n === 0);
    await db.exec(`update notify_01a.settings set hourly_cap = 20`);
  }

  group = "[E8 payload changed]";
  {
    resend.failNext = 1;
    const { id } = await submit("Gaston Morel");
    await due(id);
    const changed = createNotifyCronHandler({ env: { ...env, RESEND_FROM_EMAIL: "Autre nom <contact@digitallab.studio>" }, makeRpc: () => rpc, send });
    const before = resend.deliveries.length;
    await changed({ method: "GET", headers: { authorization: `Bearer ${env.CRON_SECRET}` } }, { setHeader() {}, status() { return this; }, json() { return this; } });
    const r = await row(id);
    check("sender changed between attempts → dead payload_changed, nothing sent", r.status === "dead" && r.last_error === "payload_changed" && resend.deliveries.length === before, `${r.status} ${r.last_error}`);
  }

  group = "[E9 pause / resume]";
  {
    await run(db, N90);
    const before = resend.deliveries.length;
    const { response, id } = await submit("Hugo Faure");
    check("paused: request saved, answer 202, nothing sent", response.status === 202 && resend.deliveries.length === before && !(await row(id)));
    await run(db, N91);
    await frontendCall({});
    check("resumed: the request saved during the pause is sent", (await row(id))?.status === "sent" && resend.deliveries.length === before + 1);
  }

  group = "[logs]";
  {
    const all = logs.join("\n");
    check("server logs contain no visitor data and no secret",
      !["Alice", "alicemartin@example.fr", "Bonjour, ici", "re_test_not_real", "test-service-key", "test-cron-secret"].some((s) => all.includes(s)));
    check("server logs do contain the diagnostic counters", all.includes("[notify-01a] cron") && all.includes("\"result\":\"sent\""));
  }

  group = "[cutover]";
  {
    // A fresh replica: requests saved before activation are never notified by NOTIFY-01A.
    await model.close();
    db = await prod();
    await run(db, N01);
    const before = resend.deliveries.length;
    await formInsert(db, "anon", null, { name: "Avant bascule" });
    await frontendCall({});
    check("migration applied but not activated: nothing sent (old relay window)", resend.deliveries.length === before);
    await run(db, N02);
    await (await cronCall()).json();
    check("activation does not resend requests saved before cutover_at", resend.deliveries.length === before);
    await formInsert(db, "anon", null, { name: "Après bascule" });
    await frontendCall({});
    check("first request after cutover is sent", resend.deliveries.length === before + 1);
  }
} finally {
  Object.assign(console, saved);
  await model.close();
  fakeResend.close();
  app.close();
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
