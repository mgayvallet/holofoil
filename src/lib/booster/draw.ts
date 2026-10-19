import type { CardLite, SetSnapshot } from "@/lib/tcgdex/types";
import { cardValue, tierOf, tierRank, TIER_ORDER, type Tier } from "./rarity";
import { eraFor } from "./eras";
import type { EraConfig, SlotConfig, SlotPool, SlotUpgrade } from "./eras/types";

export interface DrawnCard {
  cardId: string;
  name: string;
  image: string;
  rarity: string;
  tier: Tier;
  reverse: boolean;
  slot: string;
  value: number;
}

/** Générateur aléatoire injecté : `crypto` côté serveur, seedé dans les tests */
export type Rng = () => number;

class SetPools {
  private byTier = new Map<Tier, CardLite[]>();
  readonly subset: CardLite[] = [];
  readonly all: CardLite[];
  /** Certains sets anciens n'ont aucune variante Reverse renseignée dans TCGdex */
  private hasReverseData: boolean;
  constructor(cards: CardLite[]) {
    this.all = cards;
    this.hasReverseData = cards.some((c) => c.reverse);
    for (const c of cards) {
      if (c.subset) {
        this.subset.push(c);
        continue;
      }
      const t = tierOf(c.rarity);
      if (!this.byTier.has(t)) this.byTier.set(t, []);
      this.byTier.get(t)!.push(c);
    }
  }
  tiers() {
    return [...this.byTier.keys()];
  }
  cards(pool: SlotPool): CardLite[] {
    if (pool.all) return this.all;
    if (pool.subset) {
      return pool.tiers.length ? this.subset.filter((c) => pool.tiers.includes(tierOf(c.rarity))) : this.subset;
    }
    const all = pool.tiers.flatMap((t) => this.byTier.get(t) ?? []);
    return pool.reverse && this.hasReverseData ? all.filter((c) => c.reverse) : all;
  }
}

/**
 * Applique les taux spécifiques du set et ajoute les paliers "orphelins"
 * (présents dans le set mais couverts par aucun slot) au dernier slot,
 * pour que chaque carte du set reste obtenable.
 */
export function resolveSlots(era: EraConfig, setId: string, pools: SetPools): SlotConfig[] {
  const rates = era.setRates?.[setId] ?? {};
  const slots: SlotConfig[] = era.slots.map((s) => ({
    ...s,
    upgrades: s.upgrades?.map((u) => ({ ...u, chance: rates[u.subset ? "subset" : u.tiers[0]] ?? u.chance })),
  }));
  if (slots.some((s) => s.base.all)) return slots; // tout le set est déjà tirable

  const covered = new Set<Tier>();
  let subsetCovered = false;
  for (const s of slots) {
    for (const p of [s.base, ...(s.upgrades ?? [])]) {
      if (p.subset) subsetCovered = true;
      else p.tiers.forEach((t) => covered.add(t));
    }
  }
  const extra: SlotUpgrade[] = pools
    .tiers()
    .filter((t) => !covered.has(t))
    .map((t) => ({ tiers: [t], chance: 1 / 40 }));
  if (pools.subset.length && !subsetCovered) extra.push({ tiers: [], subset: true, chance: 1 / 10 });
  if (extra.length) {
    const last = slots[slots.length - 1];
    last.upgrades = [...extra, ...(last.upgrades ?? [])];
  }
  return slots;
}

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Tirage pondéré : plus une carte est rare, moins elle sort (sets "collection") */
function pickWeighted(cards: CardLite[], rng: Rng): CardLite {
  const n = TIER_ORDER.length;
  const weights = cards.map((c) => (n - tierRank(tierOf(c.rarity))) ** 2);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cards.length; i++) {
    r -= weights[i];
    if (r < 0) return cards[i];
  }
  return cards[cards.length - 1];
}

/**
 * Tire une carte pour un slot, sans jamais reprendre une carte déjà sortie dans ce booster
 * (`taken`) : pas de doublon, même en version Reverse.
 */
function drawSlot(
  slot: SlotConfig,
  pools: SetPools,
  rng: Rng,
  taken: Set<string>,
): { card: CardLite; reverse: boolean } {
  const free = (cards: CardLite[]) => cards.filter((c) => !taken.has(c.id));

  // Seuls les upgrades qui ont encore des cartes disponibles sont éligibles
  const roll = rng();
  let acc = 0;
  for (const up of slot.upgrades ?? []) {
    const cards = free(pools.cards(up));
    if (!cards.length) continue;
    acc += up.chance;
    if (roll < acc) return { card: pick(cards, rng), reverse: Boolean(up.reverse) };
  }

  if (slot.base.all) {
    const cards = free(pools.all);
    return { card: pickWeighted(cards.length ? cards : pools.all, rng), reverse: false };
  }

  let cards = free(pools.cards(slot.base));
  let reverse = Boolean(slot.base.reverse);
  if (!cards.length) {
    // Pool épuisé ou set atypique : sans contrainte Reverse, puis paliers les plus communs d'abord
    cards = free(pools.cards({ tiers: slot.base.tiers }));
    reverse = false;
    for (const t of TIER_ORDER) {
      if (cards.length) break;
      cards = free(pools.cards({ tiers: [t] }));
    }
    if (!cards.length) cards = free(pools.all);
    // Set plus petit que le booster : impossible d'éviter un doublon
    if (!cards.length) cards = pools.all;
  }
  return { card: pick(cards, rng), reverse };
}

/** Ouvre un booster du set : renvoie les cartes triées de la moins rare à la plus rare */
export function drawBooster(set: SetSnapshot, rng: Rng): DrawnCard[] {
  if (!set.cards.length) throw new Error(`Set ${set.id} vide`);
  const era = eraFor(set.id, set.serieId);
  const pools = new SetPools(set.cards);
  const slots = resolveSlots(era, set.id, pools);

  const drawn: DrawnCard[] = [];
  const taken = new Set<string>();
  for (const slot of slots) {
    for (let i = 0; i < slot.count; i++) {
      const { card, reverse } = drawSlot(slot, pools, rng, taken);
      taken.add(card.id);
      drawn.push({
        cardId: card.id,
        name: card.name,
        image: card.image,
        rarity: card.rarity,
        tier: tierOf(card.rarity),
        reverse,
        slot: slot.label,
        value: cardValue(card.rarity, reverse),
      });
    }
  }

  // Tri stable : palier croissant, Reverse après la version normale du même palier
  return drawn
    .map((c, i) => ({ c, i }))
    .sort(
      (a, b) =>
        tierRank(a.c.tier) - tierRank(b.c.tier) ||
        Number(a.c.reverse) - Number(b.c.reverse) ||
        a.i - b.i,
    )
    .map(({ c }) => c);
}
