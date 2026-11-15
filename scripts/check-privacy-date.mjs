// DL-PRIVACY-CONSENT-01 pre-release gate for the privacy policy date ("Dernière mise à jour").
//
// Run on the day the new notice is published, just before the production deployment:
//   npm run check:privacy-date
// It fails while PRIVACY_POLICY_LAST_UPDATED (src/App.jsx) is still the date of the notice that predates
// the consent update, is not a real calendar date, or lies in the future. It is deliberately NOT part of
// CI or check:release: until publication it is expected to fail, and no future date may be invented.
import { readFile } from "node:fs/promises";

const PRE_CONSENT_NOTICE_DATE = "2026-09-01";
const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const match = source.match(/const PRIVACY_POLICY_LAST_UPDATED = "(\d{4}-\d{2}-\d{2})";/);

const fail = (message) => {
  console.error(`Privacy policy date: FAIL. ${message}`);
  process.exit(1);
};

if (!match) fail("PRIVACY_POLICY_LAST_UPDATED (YYYY-MM-DD) not found in src/App.jsx.");
const value = match[1];
const [year, month, day] = value.split("-").map(Number);
const date = new Date(Date.UTC(year, month - 1, day));
if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail(`${value} is not a valid date.`);
if (value === PRE_CONSENT_NOTICE_DATE) {
  fail(`${value} is the date of the previous notice. Set it to the actual publication day before deploying the consent update.`);
}
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
if (value > today) fail(`${value} is in the future (today is ${today}). Use the actual publication day.`);
console.log(`Privacy policy date: PASS (${value}).`);
