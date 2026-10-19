import "server-only";
import { randomInt } from "node:crypto";
import { GAME } from "@/lib/config";
import { drawBooster, type DrawnCard } from "@/lib/booster/draw";
import { cardValue, tierOf, tierRank, type Tier } from "@/lib/booster/rarity";
import { getPlayableSets, getSetSnapshot } from "@/lib/tcgdex/api";
import { setIdFromCardId } from "@/lib/tcgdex/ids";
import type { CardLite, SetSnapshot } from "@/lib/tcgdex/types";
import { store, GameError, type OwnedCard, type Profile } from "@/lib/store";
import { availableBoosters, timerState, type TimerState } from "./timer";
import { getCategory, pickSet } from "./categories";
import { hasUnlimitedCoins } from "./demo";
import { ACHIEVEMENT_BY_ID } from "./achievements";

/** RNG cryptographique : le tirage n'est jamais fait côté client */
const secureRng = () => randomInt(0, 2 ** 32) / 2 ** 32;

export interface OpenedCard extends DrawnCard {
  isNew: boolean;
}

export interface OpeningResult {
  openingId: string;
  /** Catégorie ouverte et set réellement tiré */
  category: { id: string; name: string };
  set: { id: string; name: string; logo?: string; serieName: string };
  cards: OpenedCard[];
  value: number;
  timer: TimerState;
  coins: number;
  newAchievements: { id: string; title: string; icon: string }[];
}

export async function openBooster(profile: Profile, categoryId: string): Promise<OpeningResult> {
  const category = await getCategory(categoryId);
  if (!category) throw new GameError("NOT_FOUND", "Ce booster n'existe pas");
  // Vérification rapide avant de charger le set (la vraie consommation est atomique dans commitOpening)
  if (availableBoosters(profile.boosterAnchor) + profile.bonusBoosters < 1) {
    throw new GameError("NO_BOOSTER", "Aucun booster disponible");
  }
  // Le set est tiré au hasard dans la catégorie, puis ses vraies règles de booster s'appliquent
  const setId = pickSet(category, secureRng).id;
  const set = await getSetSnapshot(setId);
  const cards = drawBooster(set, secureRng);
  const value = cards.reduce((s, c) => s + c.value, 0);

  const { opening, newCardIds } = await store().commitOpening(profile.id, setId, cards, value);
  const fresh = new Set(newCardIds);
  const opened = cards.map((c) => {
    const isNew = fresh.delete(c.cardId); // seul le 1er exemplaire est "nouveau"
    return { ...c, isNew };
  });

  const newAchievements = await evaluateAchievements(profile.id);
  const updated = (await store().getProfile(profile.id))!;
  return {
    openingId: opening.id,
    category: { id: category.id, name: category.name },
    set: { id: set.id, name: set.name, logo: set.logo, serieName: set.serieName },
    cards: opened,
    value,
    timer: timerState(updated.boosterAnchor, updated.bonusBoosters),
    coins: updated.coins,
    newAchievements,
  };
}

// ---------- Collection ----------

export interface SetProgress {
  setId: string;
  owned: number;
  total: number;
  percent: number;
}

/** Nombre de cartes réellement obtenables dans le set (snapshot) */
function setSize(snap: SetSnapshot) {
  return snap.cards.length;
}


export async function getOwnedBySet(userId: string) {
  const cards = await store().getUserCards(userId);
  const bySet = new Map<string, OwnedCard[]>();
  for (const c of cards) {
    if (!bySet.has(c.setId)) bySet.set(c.setId, []);
    bySet.get(c.setId)!.push(c);
  }
  return bySet;
}

export async function getCollectionOverview(userId: string): Promise<SetProgress[]> {
  const [sets, bySet] = await Promise.all([getPlayableSets(), getOwnedBySet(userId)]);
  // Le total du set (sous-sets compris) est déjà connu : inutile de recharger toutes ses cartes
  return sets.map((s) => {
    const owned = bySet.get(s.id)?.length ?? 0;
    const total = s.total;
    return { setId: s.id, owned, total, percent: total ? Math.floor((owned / total) * 100) : 0 };
  });
}

// ---------- Économie ----------

export interface Duplicate {
  card: CardLite;
  quantity: number;
  sellable: number;
  unitPrice: number;
}

export async function getDuplicates(userId: string): Promise<Duplicate[]> {
  const owned = (await store().getUserCards(userId)).filter((c) => c.quantity > 1);
  const setIds = [...new Set(owned.map((c) => c.setId))];
  const snaps = await Promise.all(setIds.map((id) => getSetSnapshot(id).catch(() => null)));
  const index = new Map<string, CardLite>();
  for (const s of snaps) s?.cards.forEach((c) => index.set(c.id, c));
  return owned
    .map((o) => {
      const card = index.get(o.cardId);
      if (!card) return null;
      return { card, quantity: o.quantity, sellable: o.quantity - 1, unitPrice: cardValue(card.rarity) };
    })
    .filter((d): d is Duplicate => d !== null)
    .sort((a, b) => tierRank(tierOf(b.card.rarity)) - tierRank(tierOf(a.card.rarity)));
}

/** Vend des doublons. Les prix sont recalculés côté serveur (jamais fournis par le client). */
export async function sellDuplicates(userId: string, request: { cardId: string; quantity: number }[] | "all") {
  const dups = await getDuplicates(userId);
  const byId = new Map(dups.map((d) => [d.card.id, d]));
  const items =
    request === "all"
      ? dups.map((d) => ({ cardId: d.card.id, quantity: d.sellable, unitPrice: d.unitPrice }))
      : request.map((r) => {
          const d = byId.get(r.cardId);
          if (!d || r.quantity < 1 || r.quantity > d.sellable)
            throw new GameError("NOT_ENOUGH_CARDS", "Tu dois garder au moins un exemplaire");
          return { cardId: r.cardId, quantity: Math.floor(r.quantity), unitPrice: d.unitPrice };
        });
  if (!items.length) throw new GameError("NOT_ENOUGH_CARDS", "Aucun doublon à vendre");
  const res = await store().sellCards(userId, items);
  const newAchievements = await evaluateAchievements(userId);
  return { ...res, newAchievements };
}

export async function buyBooster(userId: string) {
  // Compte de démo : pièces illimitées, le booster est gratuit
  const p = await store().buyBonusBooster(userId, hasUnlimitedCoins(userId) ? 0 : GAME.bonusBoosterPrice);
  return { coins: p.coins, timer: timerState(p.boosterAnchor, p.bonusBoosters) };
}

/** Retrouve les infos (image, rareté…) d'une liste d'ids de cartes via les snapshots de sets */
export async function hydrateCards(cardIds: string[]): Promise<Map<string, CardLite>> {
  const setIds = [...new Set(cardIds.map(setIdFromCardId))];
  const snaps = await Promise.all(setIds.map((id) => getSetSnapshot(id).catch(() => null)));
  const wanted = new Set(cardIds);
  const out = new Map<string, CardLite>();
  for (const s of snaps) s?.cards.forEach((c) => wanted.has(c.id) && out.set(c.id, c));
  return out;
}

// ---------- Succès ----------

export async function evaluateAchievements(userId: string) {
  const s = store();
  const [unlocked, profile, stats, bySet] = await Promise.all([
    s.getAchievements(userId),
    s.getProfile(userId),
    s.getStats(userId),
    getOwnedBySet(userId),
  ]);
  const have = new Set(unlocked.map((a) => a.id));
  const earned = new Set<string>();
  const add = (id: string, cond: boolean) => cond && !have.has(id) && earned.add(id);

  add("first_booster", stats.openings >= 1);
  add("boosters_10", stats.openings >= 10);
  add("boosters_100", stats.openings >= 100);
  add("first_sale", stats.sales >= 1);
  add("first_trade", stats.tradesDone >= 1);
  add("rich", (profile?.coins ?? 0) >= 5000);

  let unique = 0;
  for (const cards of bySet.values()) unique += cards.length;
  add("unique_100", unique >= 100);
  add("unique_500", unique >= 500);

  const tierGoals: [string, Tier[]][] = [
    ["first_double", ["double"]],
    ["first_ultra", ["ultra"]],
    ["first_illus", ["illus"]],
    ["first_special", ["special"]],
    ["first_hyper", ["hyper", "megaHyper"]],
  ];
  const needsCards =
    tierGoals.some(([id]) => !have.has(id)) || !have.has("first_set") || !have.has("set_half");
  if (needsCards) {
    const tiersOwned = new Set<Tier>();
    for (const [setId, cards] of bySet) {
      const snap = await getSetSnapshot(setId).catch(() => null);
      if (!snap) continue;
      const rarity = new Map(snap.cards.map((c) => [c.id, c.rarity]));
      for (const c of cards) {
        const r = rarity.get(c.cardId);
        if (r) tiersOwned.add(tierOf(r));
      }
      const pct = cards.length / setSize(snap);
      add("set_half", pct >= 0.5);
      add("first_set", pct >= 1);
    }
    for (const [id, tiers] of tierGoals) add(id, tiers.some((t) => tiersOwned.has(t)));
  }

  const ids = [...earned];
  await s.unlockAchievements(userId, ids);
  return ids.map((id) => ({ id, title: ACHIEVEMENT_BY_ID[id].title, icon: ACHIEVEMENT_BY_ID[id].icon }));
}

// ---------- Classement ----------

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string | null;
  unique: number;
  total: number;
  setsCompleted: number;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [rows, sets] = await Promise.all([store().leaderboardRows(), getPlayableSets()]);
  const sizes = new Map(sets.map((s) => [s.id, s.total]));
  const users = new Map<string, Omit<LeaderboardEntry, "username" | "avatar">>();
  for (const r of rows) {
    const u = users.get(r.userId) ?? { userId: r.userId, unique: 0, total: 0, setsCompleted: 0 };
    u.unique += r.unique;
    u.total += r.total;
    const size = sizes.get(r.setId);
    if (size && r.unique >= size) u.setsCompleted += 1;
    users.set(r.userId, u);
  }
  const profiles = await store().getProfiles([...users.keys()]);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return [...users.values()]
    .filter((u) => byId.has(u.userId))
    .map((u) => ({ ...u, username: byId.get(u.userId)!.username, avatar: byId.get(u.userId)!.avatar }));
}

// ---------- Amis ----------

export interface FriendView {
  userId: string;
  username: string;
  avatar: string | null;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  unique: number;
}

/** Amitiés d'un joueur, enrichies (pseudo, avatar, nombre de cartes différentes) */
export async function getFriendsView(userId: string): Promise<FriendView[]> {
  const links = await store().listFriendships(userId);
  if (!links.length) return [];
  const [profiles, rows] = await Promise.all([
    store().getProfiles(links.map((l) => l.userId)),
    store().leaderboardRows(),
  ]);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const unique = new Map<string, number>();
  for (const r of rows) unique.set(r.userId, (unique.get(r.userId) ?? 0) + r.unique);
  return links
    .filter((l) => byId.has(l.userId))
    .map((l) => ({
      ...l,
      username: byId.get(l.userId)!.username,
      avatar: byId.get(l.userId)!.avatar,
      unique: unique.get(l.userId) ?? 0,
    }))
    .sort((a, b) => a.username.localeCompare(b.username, "fr"));
}

export async function pendingFriendRequests(userId: string) {
  return (await store().listFriendships(userId)).filter((f) => f.status === "pending" && f.direction === "incoming")
    .length;
}
