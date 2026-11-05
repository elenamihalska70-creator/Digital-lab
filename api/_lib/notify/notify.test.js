// LOT NOTIFY-01A — unit tests (node:test, no network). Run: npm run test:notify
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOTIFY_RECIPIENTS, parseSender, readNotifyConfig } from "./config.js";
import { buildPayload, formatParisDate, payloadSha256 } from "./render.js";
import { sendViaResend } from "./resend.js";
import { processOutbox } from "./worker.js";
import { createSupabaseRpc } from "./supabase.js";
import { createMemoryRateLimiter, safeEqual } from "./http.js";
import { createNotifyKickHandler } from "../../send-contact-email.js";
import { createNotifyCronHandler } from "../../cron/notify-reconcile.js";

// Placeholder values only: no real secret anywhere in the tests.
const ENV = Object.freeze({
  SUPABASE_URL: "https://abcdefghijklmnop.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key-not-real",
  VITE_SUPABASE_ANON_KEY: "test-anon-key-not-real",
  RESEND_API_KEY: "re_test_not_real",
  RESEND_FROM_EMAIL: "Digital Lab <notifications@digitallab.studio>",
  CRON_SECRET: "test-cron-secret-0123456789",
  VERCEL_ENV: "production",
});
const CONFIG = readNotifyConfig(ENV).config;
const REQUEST_ROW = Object.freeze({
  outbox_id: 7, kind: "new_request", attempts: 1, idempotency_key: "notify-01a/11111111-1111-4111-8111-111111111111",
  payload_sha256: null, request_id: "11111111-1111-4111-8111-111111111111", reference: "DL-2026-0042",
  name: "Alice <script>", email: "alice@example.fr", company: "ACME & Co", project_type: "Site web",
  message: "Bonjour\nJe veux un site.", request_created_at: "2026-11-04T14:05:00.000+00:00", alert_day: null,
});
const ALERT_ROW = Object.freeze({ ...REQUEST_ROW, outbox_id: 8, kind: "volume_alert", request_id: null, idempotency_key: "notify-01a/volume-alert/2026-11-04", alert_day: "2026-11-04", name: null, email: null, message: null });

const fakeResponse = () => {
  const res = { statusCode: 0, headers: {}, body: undefined };
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const fakeRpc = (rows = [REQUEST_ROW]) => {
  const calls = { claim: [], mark: [], reconcile: 0 };
  let pending = [...rows];
  return {
    calls,
    claim: async (limit) => { calls.claim.push(limit); const out = pending.slice(0, limit); pending = pending.slice(limit); return out; },
    mark: async (row, outcome, sha) => { calls.mark.push({ row, outcome, sha }); return outcome.result === "retry" ? "failed" : outcome.result; },
    reconcile: async () => { calls.reconcile += 1; return { enabled: true, enqueued: 0, pending: pending.length }; },
  };
};
const quiet = (fn) => async (...args) => {
  const saved = { info: console.info, warn: console.warn, error: console.error };
  const lines = [];
  console.info = console.warn = console.error = (...parts) => lines.push(parts.join(" "));
  try { return await fn(lines, ...args); } finally { Object.assign(console, saved); }
};

describe("config", () => {
  it("recipients are the two fixed addresses", () => {
    assert.deepEqual(NOTIFY_RECIPIENTS, ["contact@digitallab.studio", "elenamihalska70@gmail.com"]);
    assert.ok(Object.isFrozen(NOTIFY_RECIPIENTS));
    assert.deepEqual(CONFIG.to, NOTIFY_RECIPIENTS);
  });
  it("no environment variable can change the recipients", () => {
    const config = readNotifyConfig({ ...ENV, CONTACT_TO_EMAIL: "attacker@evil.example", NOTIFY_TO: "x@evil.example" }).config;
    assert.deepEqual(config.to, NOTIFY_RECIPIENTS);
  });
  it("sender must be on digitallab.studio", () => {
    assert.equal(parseSender("Digital Lab <notifications@digitallab.studio>"), "Digital Lab <notifications@digitallab.studio>");
    assert.equal(parseSender("contact@digitallab.studio"), "contact@digitallab.studio");
    assert.equal(parseSender("Digital Lab <onboarding@resend.dev>"), null);
    assert.equal(parseSender("x@digitallab.studio.evil.example"), null);
    assert.equal(parseSender("Name\r\nBcc: a@b.c <n@digitallab.studio>"), null);
    assert.equal(parseSender(""), null);
  });
  it("lists missing variables by name only", () => {
    const result = readNotifyConfig({ VERCEL_ENV: "production" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.problems, ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]);
  });
  it("refuses to run on a Preview deployment, even with every secret present", () => {
    assert.deepEqual(readNotifyConfig({ ...ENV, VERCEL_ENV: "preview" }), { ok: false, problems: ["VERCEL_ENV=preview"] });
  });
  it("refuses the public anon key as service key", () => {
    const result = readNotifyConfig({ ...ENV, SUPABASE_SERVICE_ROLE_KEY: ENV.VITE_SUPABASE_ANON_KEY });
    assert.deepEqual(result.problems, ["SUPABASE_SERVICE_ROLE_KEY"]);
  });
  it("loopback overrides (local tests) are ignored on Vercel deployments", () => {
    const deployed = readNotifyConfig({ ...ENV, NOTIFY_RESEND_API_URL: "http://127.0.0.1:9999/emails" }).config;
    assert.equal(deployed.resendUrl, "https://api.resend.com/emails");
    assert.equal(readNotifyConfig({ ...ENV, SUPABASE_URL: "http://127.0.0.1:54321" }).ok, false);
    const local = readNotifyConfig({ ...ENV, VERCEL_ENV: "", SUPABASE_URL: "http://127.0.0.1:54321", NOTIFY_RESEND_API_URL: "http://127.0.0.1:9999/emails" }).config;
    assert.equal(local.resendUrl, "http://127.0.0.1:9999/emails");
    assert.equal(readNotifyConfig({ ...ENV, VERCEL_ENV: "", NOTIFY_RESEND_API_URL: "https://evil.example/emails" }).config.resendUrl, "https://api.resend.com/emails");
  });
});

describe("render", () => {
  const payload = buildPayload(REQUEST_ROW, CONFIG);
  it("fixed recipients, sender, reply_to = visitor", () => {
    assert.deepEqual(payload.to, NOTIFY_RECIPIENTS);
    assert.equal(payload.from, CONFIG.from);
    assert.equal(payload.reply_to, "alice@example.fr");
    assert.equal(payload.headers["X-DigitalLab-Notification"], `notify-01a/${REQUEST_ROW.request_id}`);
    assert.equal(payload.cc, undefined);
    assert.equal(payload.bcc, undefined);
  });
  it("subject: reference and type, one line", () => {
    assert.equal(payload.subject, "Nouvelle demande DL-2026-0042 — Site web");
    const injected = buildPayload({ ...REQUEST_ROW, project_type: "Site\r\nBcc: x@evil.example" }, CONFIG);
    assert.ok(!/[\r\n]/.test(injected.subject));
  });
  it("escapes HTML from the visitor", () => {
    assert.ok(payload.html.includes("Alice &lt;script&gt;"));
    assert.ok(payload.html.includes("ACME &amp; Co"));
    assert.ok(!payload.html.includes("<script>"));
    assert.ok(payload.html.includes("Bonjour<br />Je veux un site."));
    assert.ok(payload.text.includes("Bonjour\nJe veux un site."));
  });
  it("no reply_to when the stored e-mail is invalid", () => {
    assert.equal(buildPayload({ ...REQUEST_ROW, email: "a@b\r\nBcc: x" }, CONFIG).reply_to, undefined);
  });
  it("truncates very long messages", () => {
    const long = buildPayload({ ...REQUEST_ROW, message: "x".repeat(20_000) }, CONFIG);
    assert.ok(long.text.length < 9_000);
    assert.ok(long.text.includes("message tronqué"));
  });
  it("deterministic: same row → same payload and hash", () => {
    assert.equal(payloadSha256(buildPayload({ ...REQUEST_ROW }, CONFIG)), payloadSha256(payload));
    assert.notEqual(payloadSha256(buildPayload({ ...REQUEST_ROW, message: "autre" }, CONFIG)), payloadSha256(payload));
    assert.equal(payloadSha256(buildPayload({ ...REQUEST_ROW, attempts: 5, outbox_id: 99 }, CONFIG)), payloadSha256(payload));
  });
  it("Paris date with numeric parts", () => {
    assert.equal(formatParisDate("2026-11-04T14:05:00.000+00:00"), "04/11/2026 15:05 (heure de Paris)");
    assert.equal(formatParisDate("2026-07-01T10:00:00Z"), "01/07/2026 12:00 (heure de Paris)");
    assert.equal(formatParisDate("not a date"), "date inconnue");
  });
  it("volume alert: no visitor data, no reply_to", () => {
    const alert = buildPayload(ALERT_ROW, CONFIG);
    assert.deepEqual(alert.to, NOTIFY_RECIPIENTS);
    assert.equal(alert.reply_to, undefined);
    assert.match(alert.subject, /Plafond de notifications atteint — 2026-11-04/);
  });
});

describe("resend", () => {
  const call = async (fetchImpl) => sendViaResend({ payload: { a: 1 }, idempotencyKey: "notify-01a/x", config: CONFIG, fetchImpl, timeoutMs: 50 });
  it("sends the idempotency key, the API key and the exact payload", async () => {
    let seen;
    const outcome = await call(async (url, init) => { seen = { url, init }; return jsonResponse(200, { id: "re_abc" }); });
    assert.deepEqual(outcome, { result: "sent", id: "re_abc" });
    assert.equal(seen.url, "https://api.resend.com/emails");
    assert.equal(seen.init.headers["Idempotency-Key"], "notify-01a/x");
    assert.equal(seen.init.headers.Authorization, "Bearer re_test_not_real");
    assert.equal(seen.init.body, JSON.stringify({ a: 1 }));
  });
  for (const [status, body, expected] of [
    [409, { name: "concurrent_idempotent_requests" }, { result: "retry", error: "idempotency_concurrent" }],
    [409, { name: "invalid_idempotent_request" }, { result: "dead", error: "idempotency_payload_mismatch" }],
    [429, { name: "rate_limit_exceeded" }, { result: "retry", error: "http_429:rate_limit_exceeded" }],
    [500, {}, { result: "retry", error: "http_500" }],
    [503, {}, { result: "retry", error: "http_503" }],
    [401, { name: "missing_api_key" }, { result: "retry", error: "http_401:missing_api_key" }],
    [403, { name: "invalid_from_address" }, { result: "retry", error: "http_403:invalid_from_address" }],
    [422, { name: "validation_error", message: "secret detail" }, { result: "dead", error: "http_422:validation_error" }],
    [400, {}, { result: "dead", error: "http_400" }],
  ]) {
    it(`HTTP ${status} ${body.name ?? ""} → ${expected.result}`, async () => {
      assert.deepEqual(await call(async () => jsonResponse(status, body)), expected);
    });
  }
  it("timeout → retry", async () => {
    const outcome = await call((url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(init.signal.reason));
    }));
    assert.deepEqual(outcome, { result: "retry", error: "timeout" });
  });
  it("network error → retry", async () => {
    assert.deepEqual(await call(async () => { throw new TypeError("fetch failed"); }), { result: "retry", error: "network" });
  });
  it("non-JSON error body handled", async () => {
    assert.deepEqual(await call(async () => ({ ok: false, status: 502, json: async () => { throw new Error("html"); } })), { result: "retry", error: "http_502" });
  });
});

describe("worker", () => {
  it("claim → send → mark with the hash of the exact payload", quiet(async () => {
    const rpc = fakeRpc();
    const sent = [];
    const summary = await processOutbox({ rpc, config: CONFIG, limit: 3, budgetMs: 1_000, send: async (args) => { sent.push(args); return { result: "sent", id: "re_1" }; } });
    assert.deepEqual(summary, { claimed: 1, sent: 1, retry: 0, dead: 0, stale: 0, skipped: 0, mark_errors: 0 });
    assert.equal(sent[0].idempotencyKey, REQUEST_ROW.idempotency_key);
    assert.equal(rpc.calls.mark[0].sha, payloadSha256(sent[0].payload));
    assert.deepEqual(rpc.calls.claim, [3]);
  }));
  it("payload changed since the first attempt → dead, nothing sent", quiet(async () => {
    const rpc = fakeRpc([{ ...REQUEST_ROW, attempts: 2, payload_sha256: "0".repeat(64) }]);
    let calls = 0;
    const summary = await processOutbox({ rpc, config: CONFIG, limit: 3, budgetMs: 1_000, send: async () => { calls += 1; return { result: "sent" }; } });
    assert.equal(calls, 0);
    assert.equal(summary.dead, 1);
    assert.equal(rpc.calls.mark[0].outcome.error, "payload_changed");
  }));
  it("same stored hash → sent again with the same key (idempotent retry)", quiet(async () => {
    const sha = payloadSha256(buildPayload(REQUEST_ROW, CONFIG));
    const rpc = fakeRpc([{ ...REQUEST_ROW, attempts: 2, payload_sha256: sha }]);
    let key;
    await processOutbox({ rpc, config: CONFIG, limit: 3, budgetMs: 1_000, send: async (args) => { key = args.idempotencyKey; return { result: "sent", id: "re_1" }; } });
    assert.equal(key, REQUEST_ROW.idempotency_key);
  }));
  it("mark failure is survivable (lease + same key)", quiet(async (lines) => {
    const rpc = fakeRpc();
    rpc.mark = async () => { const e = new Error("x"); e.code = "PGRST000"; throw e; };
    const summary = await processOutbox({ rpc, config: CONFIG, limit: 3, budgetMs: 1_000, send: async () => ({ result: "sent", id: "re_1" }) });
    assert.equal(summary.mark_errors, 1);
    assert.ok(lines.some((l) => l.includes("mark failed") && l.includes("PGRST000")));
  }));
  it("time budget: rows left leased are skipped, not sent", quiet(async () => {
    let t = 0;
    const rpc = fakeRpc([REQUEST_ROW, { ...REQUEST_ROW, outbox_id: 9 }]);
    let calls = 0;
    const summary = await processOutbox({ rpc, config: CONFIG, limit: 3, budgetMs: 100, now: () => t, send: async () => { calls += 1; t += 500; return { result: "sent" }; } });
    assert.equal(calls, 1);
    assert.equal(summary.skipped, 1);
  }));
  it("logs contain no visitor data", quiet(async (lines) => {
    await processOutbox({ rpc: fakeRpc(), config: CONFIG, limit: 3, budgetMs: 1_000, send: async () => ({ result: "retry", error: "http_503" }) });
    const all = lines.join("\n");
    for (const secret of ["Alice", "alice@example.fr", "Je veux", "ACME", "re_test_not_real", "test-service-key"]) assert.ok(!all.includes(secret), secret);
  }));
});

describe("supabase rpc adapter", () => {
  it("calls the three RPCs with the service key", async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push({ url: String(url), headers: Object.fromEntries(new Headers(init.headers)), body: init.body });
      return new Response(JSON.stringify(String(url).endsWith("notify_01a_claim") ? [REQUEST_ROW] : "sent"), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const rpc = createSupabaseRpc({ supabaseUrl: CONFIG.supabaseUrl, serviceKey: CONFIG.serviceKey, fetchImpl });
    assert.deepEqual(await rpc.claim(3), [REQUEST_ROW]);
    assert.equal(await rpc.mark(REQUEST_ROW, { result: "sent", id: "re_1" }, "a".repeat(64)), "sent");
    await rpc.reconcile();
    assert.deepEqual(seen.map((s) => s.url.replace(CONFIG.supabaseUrl, "")), ["/rest/v1/rpc/notify_01a_claim", "/rest/v1/rpc/notify_01a_mark", "/rest/v1/rpc/notify_01a_reconcile"]);
    assert.equal(seen[0].headers.apikey, CONFIG.serviceKey);
    assert.deepEqual(JSON.parse(seen[0].body), { p_limit: 3 });
    assert.deepEqual(JSON.parse(seen[1].body), { p_outbox_id: 7, p_attempts: 1, p_result: "sent", p_resend_id: "re_1", p_error: null, p_payload_sha256: "a".repeat(64) });
  });
  it("RPC errors are thrown with a code only", async () => {
    const fetchImpl = async () => new Response(JSON.stringify({ code: "42501", message: "permission denied for function" }), { status: 403, headers: { "Content-Type": "application/json" } });
    const rpc = createSupabaseRpc({ supabaseUrl: CONFIG.supabaseUrl, serviceKey: CONFIG.serviceKey, fetchImpl });
    await assert.rejects(rpc.claim(3), (error) => error.code === "42501" && !error.message.includes(CONFIG.serviceKey));
  });
});

describe("kick endpoint (former relay)", () => {
  const request = (over = {}) => ({ method: "POST", headers: { origin: "https://www.digitallab.studio", "content-type": "application/json", "x-vercel-forwarded-for": "203.0.113.5", ...(over.headers ?? {}) }, body: over.body, ...(over.method ? { method: over.method } : {}) });
  const handler = (rpc = fakeRpc(), extra = {}) => createNotifyKickHandler({ env: ENV, makeRpc: () => rpc, send: async () => ({ result: "sent", id: "re_k" }), ...extra });

  it("ignores the body entirely: an injected recipient / content changes nothing", quiet(async () => {
    const rpc = fakeRpc();
    let sentPayload;
    const h = createNotifyKickHandler({ env: ENV, makeRpc: () => rpc, send: async ({ payload }) => { sentPayload = payload; return { result: "sent", id: "x" }; } });
    const res = fakeResponse();
    await h(request({ body: { to: "attacker@evil.example", email: "attacker@evil.example", message: "SPAM", subject: "Win" } }), res);
    assert.equal(res.statusCode, 202);
    assert.deepEqual(sentPayload.to, NOTIFY_RECIPIENTS);
    assert.ok(!JSON.stringify(sentPayload).includes("SPAM"));
    assert.ok(!JSON.stringify(sentPayload).includes("attacker"));
  }));
  it("a body getter that throws (invalid JSON) is never touched", quiet(async () => {
    const req = request();
    Object.defineProperty(req, "body", { get() { throw new Error("Invalid JSON"); } });
    const res = fakeResponse();
    await handler()(req, res);
    assert.equal(res.statusCode, 202);
  }));
  it("nothing to send → 202 and no e-mail", quiet(async () => {
    const res = fakeResponse();
    let calls = 0;
    await createNotifyKickHandler({ env: ENV, makeRpc: () => fakeRpc([]), send: async () => { calls += 1; } })(request(), res);
    assert.equal(res.statusCode, 202);
    assert.equal(calls, 0);
  }));
  it("same 202 when the worker fails (no oracle), error logged without details", quiet(async (lines) => {
    const rpc = fakeRpc();
    rpc.claim = async () => { const e = new Error("boom"); e.code = "PGRST301"; throw e; };
    const res = fakeResponse();
    await handler(rpc)(request(), res);
    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, { ok: true });
    assert.ok(lines.some((l) => l.includes("PGRST301")));
  }));
  it("GET → 405, foreign origin → 403, huge body → 413", quiet(async () => {
    let res = fakeResponse();
    await handler()(request({ method: "GET" }), res);
    assert.equal(res.statusCode, 405);
    res = fakeResponse();
    await handler()(request({ headers: { origin: "https://evil.example" } }), res);
    assert.equal(res.statusCode, 403);
    res = fakeResponse();
    await handler()(request({ headers: { "content-length": "999999" } }), res);
    assert.equal(res.statusCode, 413);
  }));
  it("per-IP limit: 10 per 10 min, then 429", quiet(async () => {
    const h = handler(fakeRpc([]), { limiter: createMemoryRateLimiter() });
    const codes = [];
    for (let i = 0; i < 12; i += 1) { const res = fakeResponse(); await h(request(), res); codes.push(res.statusCode); }
    assert.deepEqual(codes, [...Array(10).fill(202), 429, 429]);
  }));
  it("not configured → 503, names logged, no secret", quiet(async (lines) => {
    const res = fakeResponse();
    await createNotifyKickHandler({ env: { VERCEL_ENV: "production", RESEND_API_KEY: "re_test_not_real" } })(request(), res);
    assert.equal(res.statusCode, 503);
    assert.ok(lines.join(" ").includes("SUPABASE_URL"));
    assert.ok(!lines.join(" ").includes("re_test_not_real"));
  }));
  it("Preview deployment with Production secrets → 503, no RPC, nothing sent", quiet(async () => {
    let made = 0;
    let sent = 0;
    const h = createNotifyKickHandler({ env: { ...ENV, VERCEL_ENV: "preview" }, makeRpc: () => { made += 1; return fakeRpc(); }, send: async () => { sent += 1; return { result: "sent", id: "x" }; } });
    const res = fakeResponse();
    await h(request(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(made, 0);
    assert.equal(sent, 0);
  }));
  it("processes at most 3 notifications per call", quiet(async () => {
    const rpc = fakeRpc(Array.from({ length: 8 }, (_, i) => ({ ...REQUEST_ROW, outbox_id: i + 1 })));
    await handler(rpc)(request(), fakeResponse());
    assert.deepEqual(rpc.calls.claim, [3]);
    assert.equal(rpc.calls.mark.length, 3);
  }));
});

describe("cron endpoint", () => {
  const request = (authorization = `Bearer ${ENV.CRON_SECRET}`, method = "GET") => ({ method, headers: authorization ? { authorization } : {} });
  const handler = (rpc = fakeRpc(), env = ENV) => createNotifyCronHandler({ env, makeRpc: () => rpc, send: async () => ({ result: "sent", id: "re_c" }) });

  it("refuses without or with a wrong secret", quiet(async () => {
    for (const auth of [null, "Bearer wrong", `bearer ${ENV.CRON_SECRET}`, ENV.CRON_SECRET, `Bearer ${ENV.CRON_SECRET}x`]) {
      const res = fakeResponse();
      await handler()(request(auth), res);
      assert.equal(res.statusCode, 401, String(auth));
    }
  }));
  it("refuses to run with a missing or short CRON_SECRET", quiet(async () => {
    for (const secret of [undefined, "", "short"]) {
      const res = fakeResponse();
      await handler(fakeRpc(), { ...ENV, CRON_SECRET: secret })(request("Bearer "), res);
      assert.equal(res.statusCode, 503);
    }
  }));
  it("Preview deployment, even with the right secret → 503, no RPC, nothing sent", quiet(async () => {
    let made = 0;
    let sent = 0;
    const h = createNotifyCronHandler({ env: { ...ENV, VERCEL_ENV: "preview" }, makeRpc: () => { made += 1; return fakeRpc(); }, send: async () => { sent += 1; return { result: "sent", id: "x" }; } });
    const res = fakeResponse();
    await h(request(), res);
    assert.equal(res.statusCode, 503);
    assert.equal(made, 0);
    assert.equal(sent, 0);
  }));
  it("POST → 405", quiet(async () => {
    const res = fakeResponse();
    await handler()(request(undefined, "POST"), res);
    assert.equal(res.statusCode, 405);
  }));
  it("reconciles, processes in rounds of 5 up to 20, reports counters only", quiet(async () => {
    const rpc = fakeRpc(Array.from({ length: 23 }, (_, i) => ({ ...REQUEST_ROW, outbox_id: i + 1 })));
    const res = fakeResponse();
    await handler(rpc)(request(), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(rpc.calls.claim, [5, 5, 5, 5]);
    assert.equal(res.body.processed.sent, 20);
    assert.equal(rpc.calls.reconcile, 2);
    assert.ok(!JSON.stringify(res.body).includes("alice"));
  }));
  it("stops early when the queue is empty", quiet(async () => {
    const rpc = fakeRpc([REQUEST_ROW]);
    const res = fakeResponse();
    await handler(rpc)(request(), res);
    assert.deepEqual(rpc.calls.claim, [5]);
  }));
  it("duplicate cron delivery is harmless (second run finds nothing)", quiet(async () => {
    const rpc = fakeRpc([REQUEST_ROW]);
    await handler(rpc)(request(), fakeResponse());
    const res = fakeResponse();
    await handler(rpc)(request(), res);
    assert.equal(res.body.processed.claimed, 0);
  }));
});

describe("http helpers", () => {
  it("safeEqual", () => {
    assert.equal(safeEqual("a", "a"), true);
    assert.equal(safeEqual("a", "b"), false);
    assert.equal(safeEqual("a", undefined), false);
  });
});
