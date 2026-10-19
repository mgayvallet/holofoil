/**
 * Simule N ouvertures de boosters pour vérifier les taux.
 *   npx tsx scripts/simulate.mts sv01 10000
 */
import { drawBooster } from "../src/lib/booster/draw";
import { tierOf, TIER_ORDER } from "../src/lib/booster/rarity";
import type { CardLite, SetSnapshot, TcgCard, TcgSet } from "../src/lib/tcgdex/types";

const [setId = "sv01", n = "10000"] = process.argv.slice(2);
const api = (p: string) => fetch(`https://api.tcgdex.net/v2/fr${p}`).then((r) => r.json());

const set = (await api(`/sets/${setId}`)) as TcgSet;
const cards: CardLite[] = [];
let i = 0;
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (i < set.cards.length) {
      const c = (await api(`/cards/${set.cards[i++].id}`)) as TcgCard;
      if (c.rarity && c.image)
        cards.push({ id: c.id, localId: c.localId, name: c.name, image: c.image, imageLang: "fr", rarity: c.rarity,
          category: c.category, types: c.types ?? [], hp: c.hp, reverse: !!c.variants?.reverse, holo: !!c.variants?.holo });
    }
  }),
);
const snap: SetSnapshot = { id: set.id, name: set.name, serieId: set.serie.id, serieName: set.serie.name,
  official: set.cardCount.official, total: set.cardCount.total, cards, fetchedAt: Date.now() };

const counts: Record<string, number> = {};
const packs = Number(n);
let sizeOk = true;
for (let k = 0; k < packs; k++) {
  const pack = drawBooster(snap, Math.random);
  if (pack.length !== pack.length) sizeOk = false;
  const seen = new Set<string>();
  for (const c of pack) seen.add(c.tier + (c.reverse ? "·rev" : ""));
  for (const t of seen) counts[t] = (counts[t] ?? 0) + 1;
}
console.log(`${set.name} (${setId}) — ${cards.length} cartes, ${packs} boosters, taille ${drawBooster(snap, Math.random).length}`);
for (const t of TIER_ORDER) for (const suf of ["", "·rev"]) {
  const k = t + suf; if (!counts[k]) continue;
  console.log(`  ${k.padEnd(14)} présent dans 1 booster sur ${(packs / counts[k]).toFixed(1)}`);
}
const example = drawBooster(snap, Math.random);
console.log("Exemple :", example.map((c) => `${c.name} [${c.rarity}${c.reverse ? " reverse" : ""}]`).join(" | "));
void tierOf; void sizeOk;
