import { readFileSync } from "node:fs";
import { verifyPricingLock } from "./pricing-lock.mjs";
const root = new URL("../", import.meta.url);
const lock = JSON.parse(readFileSync(new URL("docs/pricing-v3-lock.json", root), "utf8"));
verifyPricingLock(lock, path => readFileSync(new URL(path, root), "utf8"));
console.log("Approved pricing source/engine and preserved tax/mailto contracts: PASS");
