import test from "node:test";
import assert from "node:assert/strict";
import { pricingSourceHash, verifyPricingLock, LOCKED_PRICING_PATHS } from "./pricing-lock.mjs";

const fixtureLock = source => ({ files: Object.fromEntries(LOCKED_PRICING_PATHS.map(path => [path, pricingSourceHash(source)])) });

test("Price lock accepts its exact source and normalizes CRLF", () => {
  const source = "approved price: 390\n";
  verifyPricingLock(fixtureLock(source), () => source.replaceAll("\n","\r\n"));
});
test("Accidental price or engine changes fail with the original lock", () => {
  const lock = fixtureLock("price:390");
  assert.throws(() => verifyPricingLock(lock, () => "price:399"), /Requires a separate LOT/);
  assert.throws(() => verifyPricingLock({files:{}}, () => ""), /Empty pricing lock/);
  assert.throws(() => verifyPricingLock({files:{source:pricingSourceHash("price:390")}}, () => "price:390"), /Incomplete pricing lock coverage/);
});
test("A rewritten checksum can accept changed code: it is not owner authorization", () => {
  const changedSource = "price:399";
  verifyPricingLock(fixtureLock(changedSource), () => changedSource);
});
