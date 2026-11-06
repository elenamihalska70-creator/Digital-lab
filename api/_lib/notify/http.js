/* global process */
// LOT NOTIFY-01A — HTTP helpers, adapted from LOT SEC-EMAIL-01 (api/_lib/contactEmail.js).
import { createHash, timingSafeEqual } from "node:crypto";

const CANONICAL_ORIGINS = ["https://www.digitallab.studio", "https://digitallab.studio"];
const LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"];

/** Origins allowed to call the visitor-triggered endpoint (defence in depth, not authentication). */
export const getAllowedOrigins = (env = process.env) => {
  const origins = new Set(CANONICAL_ORIGINS);
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host && /^[a-z0-9.-]+$/i.test(host)) origins.add(`https://${host.toLowerCase()}`);
  }
  if (env.VERCEL_ENV !== "production" && env.VERCEL_ENV !== "preview") LOCAL_ORIGINS.forEach((origin) => origins.add(origin));
  return origins;
};

export const isAllowedOrigin = (origin, env = process.env) =>
  typeof origin === "string" && getAllowedOrigins(env).has(origin.toLowerCase());

export const getClientIp = (headers = {}) => {
  for (const value of [headers["x-vercel-forwarded-for"], headers["x-real-ip"], headers["x-forwarded-for"]]) {
    const first = String(Array.isArray(value) ? value[0] : value || "").split(",")[0].trim();
    if (first && first.length <= 64) return first;
  }
  return "unknown";
};

/** Best-effort limiter kept in the memory of one serverless instance. */
export const createMemoryRateLimiter = ({ now = () => Date.now() } = {}) => {
  const counters = new Map();
  return {
    hit(key, windowSeconds) {
      const current = now();
      const entry = counters.get(key);
      if (!entry || entry.resetAt <= current) counters.set(key, { count: 1, resetAt: current + windowSeconds * 1000 });
      else entry.count += 1;
      if (counters.size > 5_000) {
        for (const [storedKey, value] of counters) if (value.resetAt <= current) counters.delete(storedKey);
      }
      return counters.get(key).count;
    },
  };
};

/** Constant-time comparison of two strings (hashes first: equal lengths, no length oracle). */
export const safeEqual = (a, b) =>
  typeof a === "string" && typeof b === "string" &&
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export const reply = (response, status, body, headers = {}) => {
  response.setHeader("Cache-Control", "no-store");
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  return response.status(status).json(body);
};
