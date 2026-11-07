// LOT WEB-CONTACT-SIMPLE-01 — regression guard for the disabled legacy e-mail routes.
// api/send-contact-email.js (WEB-CONTACT-SIMPLE-01) and api/send-quote-email.js (SEC-EMAIL-02)
// must answer 410 Gone to every method, without reading the request, the environment or the
// network. Files under api/_lib are not exposed as Vercel functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROUTES = [
  { file: "send-contact-email.js", lot: "WEB-CONTACT-SIMPLE-01" },
  { file: "send-quote-email.js", lot: "SEC-EMAIL-02" },
];
const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];

const routeUrl = (file) => new URL(`../../${file}`, import.meta.url);

// A request whose every property access fails the test: the handler must not inspect it.
const untouchableRequest = (method) => {
  const accessed = [];
  const request = new Proxy(
    { method },
    {
      get(target, key) {
        if (typeof key === "symbol" || key === "then") return undefined;
        accessed.push(String(key));
        return target[key];
      },
    },
  );
  return { request, accessed };
};

const mockResponse = () => {
  const state = { status: null, headers: {}, body: undefined, sent: 0 };
  const response = {
    setHeader(name, value) {
      state.headers[name.toLowerCase()] = value;
      return response;
    },
    status(code) {
      state.status = code;
      return response;
    },
    json(body) {
      state.body = body;
      state.sent += 1;
      return response;
    },
  };
  return { response, state };
};

for (const { file, lot } of ROUTES) {
  test(`${file} (${lot}) answers 410 to every method without side effects`, async (t) => {
    const fetchCalls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      throw new Error("network access is forbidden");
    };
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const { default: handler } = await import(routeUrl(file));

    for (const method of METHODS) {
      const { request, accessed } = untouchableRequest(method);
      const { response, state } = mockResponse();

      await handler(request, response);

      assert.equal(state.status, 410, `${method}: status`);
      assert.deepEqual(state.body, { ok: false, error: "gone" }, `${method}: body`);
      assert.equal(state.headers["cache-control"], "no-store", `${method}: Cache-Control`);
      assert.equal(state.sent, 1, `${method}: exactly one response`);
      assert.deepEqual(accessed, [], `${method}: the request must not be read`);
    }

    assert.equal(fetchCalls.length, 0, "no network call");
  });

  test(`${file} (${lot}) source has no e-mail, database, env or body access`, async () => {
    const source = await readFile(routeUrl(file), "utf8");
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");

    for (const forbidden of [/\bimport\b/, /\brequire\(/, /process\.env/, /\bfetch\(/, /\.body\b/, /resend/i, /supabase/i]) {
      assert.doesNotMatch(code, forbidden, `${file} must not contain ${forbidden}`);
    }
  });
}
