// Release gate for owner-controlled settings (LOT SM-01). Run before any
// production deployment: `npm run check:release`. Exits with code 1 while a
// blocking setting is still unconfirmed. It is deliberately not part of
// `npm run build`, so previews and reviews keep building.
import { getTaxMention, TAX_MENTIONS } from "../src/config/taxMention.js";

const blockers = [];
const tax = getTaxMention();

if (!tax.confirmed) {
  blockers.push(
    `Mention fiscale non confirmée : définir TAX_REGIME dans src/config/taxMention.js (${Object.keys(TAX_MENTIONS).join(", ")}). ` +
      "Tous les prix du site (projets, abonnements, Reels) s’affichent actuellement sans mention HT/TTC.",
  );
}

if (blockers.length > 0) {
  console.error("RELEASE BLOCKED");
  blockers.forEach((blocker) => console.error(`- ${blocker}`));
  process.exit(1);
}

console.log(`Release check OK — mention fiscale : ${tax.regime}${tax.note ? ` (${tax.note})` : ""}`);
