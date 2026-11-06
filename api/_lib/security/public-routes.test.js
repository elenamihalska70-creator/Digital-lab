/* global process */
// LOT SEC-EMAIL-02 — the public e-mail routes cannot be used as relays. Run: npm run test:notify
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import quoteHandler from "../../send-quote-email.js";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = (path) => readFileSync(join(apiDir, path), "utf8");
const code = (path) => source(path).split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n");

const fakeResponse = () => {
  const res = { statusCode: 0, headers: {}, body: undefined };
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

// Records every property read on the request (body, headers, query, url…) except `method`.
const spyRequest = (method, body) => {
  const reads = [];
  const target = {
    method,
    headers: { host: "evil.example", origin: "https://evil.example", "content-type": "application/json" },
    query: { clientEmail: "victim@example.org" },
    url: "/api/send-quote-email",
  };
  Object.defineProperty(target, "body", { get() { reads.push("body"); return body; }, enumerable: true });
  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      if (prop !== "method" && typeof prop === "string") reads.push(prop);
      return Reflect.get(obj, prop, receiver);
    },
  });
  return { proxy, reads };
};

const ATTACK = { quoteId: "q1", clientEmail: "victim@example.org", clientName: "<b>Victime</b>", to: ["a@b.c"], html: "<a href=//evil>x</a>" };

describe("api/send-quote-email.js (410 Gone)", () => {
  for (const method of ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    it(`${method} → 410, nothing sent, request never read`, async () => {
      const savedFetch = globalThis.fetch;
      const savedEnv = process.env;
      const fetchCalls = [];
      const envReads = [];
      globalThis.fetch = async (...args) => { fetchCalls.push(args); throw new Error("must not be called"); };
      process.env = new Proxy({ ...savedEnv }, { get(obj, prop) { envReads.push(prop); return obj[prop]; } });
      try {
        const { proxy, reads } = spyRequest(method, ATTACK);
        const res = fakeResponse();
        await quoteHandler(proxy, res);
        assert.equal(res.statusCode, 410);
        assert.deepEqual(res.body, { ok: false, error: "gone" });
        assert.equal(res.headers["cache-control"], "no-store");
        assert.deepEqual(reads, [], `request properties read: ${reads.join(", ")}`);
        assert.equal(fetchCalls.length, 0);
        assert.deepEqual(envReads, [], `environment variables read: ${envReads.join(", ")}`);
        assert.ok(!JSON.stringify(res.body).includes("victim"));
      } finally {
        globalThis.fetch = savedFetch;
        process.env = savedEnv;
      }
    });
  }

  it("a body that cannot be parsed changes nothing", async () => {
    const req = { method: "POST", headers: {} };
    Object.defineProperty(req, "body", { get() { throw new Error("Invalid JSON"); } });
    const res = fakeResponse();
    await quoteHandler(req, res);
    assert.equal(res.statusCode, 410);
  });

  it("source: no e-mail provider, no network, no environment, no request data", () => {
    const body = code("send-quote-email.js");
    for (const forbidden of ["fetch", "resend", "process", "Deno", "request.body", "request.headers", "request.query", "import", "require("]) {
      assert.ok(!body.toLowerCase().includes(forbidden.toLowerCase()), `found "${forbidden}"`);
    }
  });
});

describe("public API surface (regression guard)", () => {
  const routes = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (name.startsWith("_") || name.startsWith(".")) continue; // not exposed by Vercel
      if (statSync(full).isDirectory()) walk(full);
      else routes.push(relative(apiDir, full).replaceAll("\\", "/"));
    }
  };
  walk(apiDir);

  it("only the three reviewed routes are exposed", () => {
    assert.deepEqual(routes.sort(), ["cron/notify-reconcile.js", "send-contact-email.js", "send-quote-email.js"]);
  });
  it("no exposed route calls Resend itself (only api/_lib/notify/resend.js does)", () => {
    for (const route of routes) assert.ok(!/api\.resend\.com/i.test(code(route)), route);
  });
  it("no exposed route reads the request body", () => {
    for (const route of routes) assert.ok(!/request\.body|req\.body/.test(code(route)), route);
  });
  it("the only module sending e-mail uses the fixed recipients", () => {
    const resendModule = code("_lib/notify/resend.js");
    assert.ok(!/\bto\s*:/.test(resendModule), "recipients must come from the payload built with NOTIFY_RECIPIENTS");
    assert.match(code("_lib/notify/config.js"), /NOTIFY_RECIPIENTS = Object\.freeze\(\["contact@digitallab\.studio", "elenamihalska70@gmail\.com"\]\)/);
  });
});
