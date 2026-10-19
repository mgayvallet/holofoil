import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GAME } from "@/lib/config";
import { availableBoosters, consumeAnchor, initialAnchor } from "@/lib/game/timer";
import { setIdFromCardId } from "@/lib/tcgdex/ids";
import {
  GameError,
  type Opening,
  type OwnedCard,
  type Profile,
  type Store,
  type Trade,
} from "./types";

/**
 * Mode démo : base JSON locale (.data/local-db.json), sans Supabase.
 * Toutes les écritures passent par une file d'attente => opérations atomiques
 * à l'échelle du process de dev.
 */

interface Db {
  profiles: Record<string, Profile>;
  cards: Record<string, Record<string, OwnedCard>>; // userId -> cardId -> carte
  openings: Opening[];
  trades: Trade[];
  achievements: Record<string, Record<string, number>>;
  sales: Record<string, number>;
  friendships?: { requester: string; addressee: string; status: "pending" | "accepted"; createdAt: number }[];
  /** Comptes locaux : uid → mot de passe haché (scrypt) */
  credentials?: Record<string, string>;
}

const FILE = path.join(process.env.HOLOFOIL_DATA_DIR ?? path.join(process.cwd(), ".data"), "local-db.json");
let db: Db | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Db> {
  if (db) return db;
  try {
    db = JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch {
    db = { profiles: {}, cards: {}, openings: [], trades: [], achievements: {}, sales: {} };
  }
  return db;
}

async function save() {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db));
}

/** Exécute une transaction sérialisée */
function tx<T>(fn: (d: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const d = await load();
    const res = await fn(d);
    await save();
    return structuredClone(res);
  });
  queue = run.catch(() => {});
  return run;
}

/** Lecture : renvoie une copie, pour que l'appelant ne puisse pas modifier la base par référence */
async function read<T>(fn: (d: Db) => T): Promise<T> {
  await queue;
  return structuredClone(fn(await load()));
}

function addCard(d: Db, userId: string, cardId: string, qty: number) {
  const mine = (d.cards[userId] ??= {});
  const cur = mine[cardId];
  if (cur) cur.quantity += qty;
  else mine[cardId] = { cardId, setId: setIdFromCardId(cardId), quantity: qty, firstObtainedAt: Date.now() };
  return !cur;
}

function removeCard(d: Db, userId: string, cardId: string, qty: number) {
  const cur = d.cards[userId]?.[cardId];
  if (!cur || cur.quantity < qty) throw new GameError("NOT_ENOUGH_CARDS", "Carte non possédée");
  cur.quantity -= qty;
  if (cur.quantity === 0) delete d.cards[userId][cardId];
}

const MAX_FRIENDS = 200;

function findFriendship(d: Db, a: string, b: string) {
  d.friendships ??= [];
  return d.friendships.find(
    (f) => (f.requester === a && f.addressee === b) || (f.requester === b && f.addressee === a),
  );
}

export const localStore: Store = {
  getProfile: (id) => read((d) => d.profiles[id] ?? null),

  ensureProfile: (id, username, avatar = null) =>
    tx((d) => {
      if (d.profiles[id]) return d.profiles[id];
      let name = username.slice(0, 20) || "Dresseur";
      const taken = new Set(Object.values(d.profiles).map((p) => p.username.toLowerCase()));
      while (taken.has(name.toLowerCase())) name = `${username.slice(0, 15)}${Math.floor(Math.random() * 1000)}`;
      const p: Profile = {
        id,
        username: name,
        avatar,
        boosterAnchor: initialAnchor(),
        bonusBoosters: 0,
        coins: GAME.startingCoins,
        createdAt: Date.now(),
      };
      d.profiles[id] = p;
      return p;
    }),

  getProfiles: (ids) => read((d) => ids.map((i) => d.profiles[i]).filter(Boolean)),

  searchProfiles: (q, limit = 10) =>
    read((d) =>
      Object.values(d.profiles)
        .filter((p) => p.username.toLowerCase().includes(q.toLowerCase()))
        .slice(0, limit),
    ),

  getUserCards: (userId, setId) =>
    read((d) => Object.values(d.cards[userId] ?? {}).filter((c) => !setId || c.setId === setId)),

  getUserCard: (userId, cardId) => read((d) => d.cards[userId]?.[cardId] ?? null),

  cardOwners: (cardId, limit = 20) =>
    read((d) =>
      Object.entries(d.cards)
        .filter(([, cards]) => (cards[cardId]?.quantity ?? 0) > 0)
        .map(([userId, cards]) => ({ userId, quantity: cards[cardId].quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit),
    ),

  commitOpening: (userId, setId, cards, value) =>
    tx((d) => {
      const p = d.profiles[userId];
      if (!p) throw new GameError("NOT_FOUND", "Profil introuvable");
      let source: Opening["source"];
      if (availableBoosters(p.boosterAnchor) >= 1) {
        p.boosterAnchor = consumeAnchor(p.boosterAnchor);
        source = "free";
      } else if (p.bonusBoosters > 0) {
        p.bonusBoosters -= 1;
        source = "bonus";
      } else {
        throw new GameError("NO_BOOSTER", "Aucun booster disponible");
      }
      const newCardIds: string[] = [];
      for (const c of cards) if (addCard(d, userId, c.cardId, 1)) newCardIds.push(c.cardId);
      const opening: Opening = { id: randomUUID(), userId, setId, cards, value, source, createdAt: Date.now() };
      d.openings.push(opening);
      return { opening, newCardIds };
    }),

  listOpenings: (userId, limit = 20) =>
    read((d) =>
      d.openings
        .filter((o) => o.userId === userId)
        .slice(-limit)
        .reverse(),
    ),

  sellCards: (userId, items) =>
    tx((d) => {
      const p = d.profiles[userId];
      let earned = 0;
      for (const it of items) {
        const cur = d.cards[userId]?.[it.cardId];
        if (!cur || it.quantity < 1 || cur.quantity - it.quantity < 1)
          throw new GameError("NOT_ENOUGH_CARDS", "Tu dois garder au moins un exemplaire");
      }
      for (const it of items) {
        removeCard(d, userId, it.cardId, it.quantity);
        earned += it.quantity * it.unitPrice;
      }
      p.coins += earned;
      d.sales[userId] = (d.sales[userId] ?? 0) + 1;
      return { earned, coins: p.coins };
    }),

  buyBonusBooster: (userId, price) =>
    tx((d) => {
      const p = d.profiles[userId];
      if (p.coins < price) throw new GameError("NOT_ENOUGH_COINS", "Pas assez de pièces");
      p.coins -= price;
      p.bonusBoosters += 1;
      return p;
    }),

  createTrade: (fromUser, toUser, offerCardId, requestCardId) =>
    tx((d) => {
      if (fromUser === toUser) throw new GameError("TRADE_INVALID", "Impossible d'échanger avec soi-même");
      if (!d.cards[fromUser]?.[offerCardId]) throw new GameError("NOT_ENOUGH_CARDS", "Tu ne possèdes pas cette carte");
      if (!d.cards[toUser]?.[requestCardId])
        throw new GameError("NOT_ENOUGH_CARDS", "Ce joueur ne possède pas cette carte");
      const t: Trade = {
        id: randomUUID(),
        fromUser,
        toUser,
        offerCardId,
        requestCardId,
        status: "pending",
        createdAt: Date.now(),
        resolvedAt: null,
      };
      d.trades.push(t);
      return t;
    }),

  listTrades: (userId) =>
    read((d) =>
      d.trades.filter((t) => t.fromUser === userId || t.toUser === userId).sort((a, b) => b.createdAt - a.createdAt),
    ),

  respondTrade: (tradeId, userId, accept) =>
    tx((d) => {
      const t = d.trades.find((x) => x.id === tradeId);
      if (!t || t.toUser !== userId || t.status !== "pending")
        throw new GameError("TRADE_INVALID", "Échange introuvable ou déjà traité");
      t.resolvedAt = Date.now();
      if (!accept) {
        t.status = "declined";
        return t;
      }
      const a = d.cards[t.fromUser]?.[t.offerCardId];
      const b = d.cards[t.toUser]?.[t.requestCardId];
      if (!a || !b) {
        t.status = "failed";
        return t;
      }
      removeCard(d, t.fromUser, t.offerCardId, 1);
      removeCard(d, t.toUser, t.requestCardId, 1);
      addCard(d, t.toUser, t.offerCardId, 1);
      addCard(d, t.fromUser, t.requestCardId, 1);
      t.status = "accepted";
      return t;
    }),

  cancelTrade: (tradeId, userId) =>
    tx((d) => {
      const t = d.trades.find((x) => x.id === tradeId);
      if (!t || t.fromUser !== userId || t.status !== "pending")
        throw new GameError("TRADE_INVALID", "Échange introuvable ou déjà traité");
      t.status = "cancelled";
      t.resolvedAt = Date.now();
      return t;
    }),

  getAchievements: (userId) =>
    read((d) => Object.entries(d.achievements[userId] ?? {}).map(([id, unlockedAt]) => ({ id, unlockedAt }))),

  unlockAchievements: async (userId, ids) => {
    if (!ids.length) return;
    await tx((d) => {
      const mine = (d.achievements[userId] ??= {});
      for (const id of ids) mine[id] ??= Date.now();
    });
  },

  getStats: (userId) =>
    read((d) => ({
      openings: d.openings.filter((o) => o.userId === userId).length,
      sales: d.sales[userId] ?? 0,
      tradesDone: d.trades.filter(
        (t) => t.status === "accepted" && (t.fromUser === userId || t.toUser === userId),
      ).length,
    })),

  leaderboardRows: () =>
    read((d) => {
      const rows = [];
      for (const [userId, cards] of Object.entries(d.cards)) {
        const bySet = new Map<string, { unique: number; total: number }>();
        for (const c of Object.values(cards)) {
          const r = bySet.get(c.setId) ?? { unique: 0, total: 0 };
          r.unique += 1;
          r.total += c.quantity;
          bySet.set(c.setId, r);
        }
        for (const [setId, r] of bySet) rows.push({ userId, setId, ...r });
      }
      return rows;
    }),

  listFriendships: (userId) =>
    read((d) =>
      (d.friendships ?? [])
        .filter((f) => f.requester === userId || f.addressee === userId)
        .map((f) => ({
          userId: f.requester === userId ? f.addressee : f.requester,
          status: f.status,
          direction: f.requester === userId ? ("outgoing" as const) : ("incoming" as const),
          createdAt: f.createdAt,
        })),
    ),

  sendFriendRequest: (from, to) =>
    tx((d) => {
      if (from === to) throw new GameError("FRIEND_INVALID", "Tu ne peux pas t'ajouter toi-même");
      if (!d.profiles[to]) throw new GameError("NOT_FOUND", "Joueur introuvable");
      const existing = findFriendship(d, from, to);
      if (existing?.status === "accepted") throw new GameError("FRIEND_INVALID", "Vous êtes déjà amis");
      if (existing?.requester === from) throw new GameError("FRIEND_INVALID", "Demande déjà envoyée");
      if (existing) {
        existing.status = "accepted"; // il t'avait déjà demandé
        return "accepted";
      }
      const count = d.friendships!.filter((f) => f.requester === from || f.addressee === from).length;
      if (count >= MAX_FRIENDS) throw new GameError("FRIEND_INVALID", "Liste d'amis pleine");
      d.friendships!.push({ requester: from, addressee: to, status: "pending", createdAt: Date.now() });
      return "sent";
    }),

  respondFriendRequest: (userId, from, accept) =>
    tx((d) => {
      const f = findFriendship(d, userId, from);
      if (!f || f.addressee !== userId || f.status !== "pending")
        throw new GameError("FRIEND_INVALID", "Demande introuvable");
      if (accept) f.status = "accepted";
      else d.friendships = d.friendships!.filter((x) => x !== f);
    }),

  removeFriend: (userId, other) =>
    tx((d) => {
      const f = findFriendship(d, userId, other);
      if (f) d.friendships = d.friendships!.filter((x) => x !== f);
    }),
};

/**
 * Comptes du mode local (pseudo + mot de passe). En mode Supabase, c'est Supabase Auth qui gère les comptes.
 */
export const localAccounts = {
  /** Crée le compte. `claimLegacy` : autorise à protéger un ancien compte de démo sans mot de passe. */
  register: (uid: string, username: string, passwordHash: string, claimLegacy: boolean) =>
    tx((d) => {
      d.credentials ??= {};
      if (d.credentials[uid]) return "taken" as const;
      if (d.profiles[uid] && !claimLegacy) return "taken" as const;
      d.credentials[uid] = passwordHash;
      if (!d.profiles[uid]) {
        d.profiles[uid] = {
          id: uid,
          username: username.slice(0, 20),
          avatar: null,
          boosterAnchor: initialAnchor(),
          bonusBoosters: 0,
          coins: GAME.startingCoins,
          createdAt: Date.now(),
        };
      }
      return "created" as const;
    }),

  /** Hash stocké, null si le compte n'a pas de mot de passe ; undefined si le profil n'existe pas */
  getHash: (uid: string) =>
    read((d) => (d.credentials?.[uid] ?? (d.profiles[uid] ? null : undefined)) as string | null | undefined),

  getUsername: (uid: string) => read((d) => d.profiles[uid]?.username ?? null),

  /** Remplace le mot de passe (compte de démo) */
  setHash: (uid: string, passwordHash: string) =>
    tx((d) => {
      (d.credentials ??= {})[uid] = passwordHash;
    }),

  /** Cadeau de bienvenue du compte de démo */
  grant: (uid: string, coins: number, bonusBoosters: number) =>
    tx((d) => {
      const p = d.profiles[uid];
      if (!p) return;
      p.coins += coins;
      p.bonusBoosters += bonusBoosters;
    }),
};
