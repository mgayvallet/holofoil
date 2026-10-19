/**
 * Vérifie des sets de toutes les générations : snapshot, provenance des images, tirages.
 *   HOLOFOIL_DATA_DIR=/tmp/hf node --conditions=react-server --import tsx scripts/check-eras.mts base1 neo1 …
 */
import { getSetSnapshot } from "../src/lib/tcgdex/api";
import { drawBooster } from "../src/lib/booster/draw";
import { eraFor } from "../src/lib/booster/eras";
import { TIER_ORDER } from "../src/lib/booster/rarity";

const ids = process.argv.slice(2);
for (const id of ids) {
  const t0 = Date.now();
  const snap = await getSetSnapshot(id);
  const src = { fr: 0, en: 0, ptcg: 0, gen: 0 };
  for (const c of snap.cards) {
    if (c.image.startsWith("ptcg:")) src.ptcg++;
    else if (c.image.startsWith("gen:")) src.gen++;
    else src[c.imageLang === "fr" ? "fr" : "en"]++;
  }
  const N = 3000;
  const seen: Record<string, number> = {};
  let subset = 0;
  const sizes = new Set<number>();
  const drawnIds = new Set<string>();
  let duplicates = 0;
  for (let i = 0; i < N; i++) {
    const pack = drawBooster(snap, Math.random);
    sizes.add(pack.length);
    if (new Set(pack.map((c) => c.cardId)).size !== pack.length) duplicates++;
    const tiers = new Set(pack.map((c) => c.tier));
    for (const t of tiers) seen[t] = (seen[t] ?? 0) + 1;
    if (pack.some((c) => snap.cards.find((x) => x.id === c.cardId)?.subset)) subset++;
    pack.forEach((c) => drawnIds.add(c.cardId));
  }
  const rates = TIER_ORDER.filter((t) => seen[t]).map((t) => `${t} 1/${(N / seen[t]).toFixed(1)}`).join(", ");
  console.log(
    `${id.padEnd(10)} ${snap.name} [${eraFor(snap.id, snap.serieId).id}] ${snap.cards.length} cartes (${Date.now() - t0} ms)` +
      `\n   images fr=${src.fr} en=${src.en} pokemontcg=${src.ptcg} générées=${src.gen}` +
      `\n   taille booster ${[...sizes]} · ${rates}${subset ? ` · sous-set 1/${(N / subset).toFixed(1)}` : ""}` +
      ` · cartes vues ${drawnIds.size}/${snap.cards.length} · boosters avec doublon : ${duplicates}`,
  );
}
