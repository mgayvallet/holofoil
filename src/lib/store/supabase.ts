import "server-only";
import { BOOSTER_INTERVAL_MS, GAME } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DrawnCard } from "@/lib/booster/draw";
import { initialAnchor } from "@/lib/game/timer";
import { GameError, type Opening, type OwnedCard, type Profile, type Store, type Trade } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const db = () => supabaseAdmin();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ts = (v: string | null) => (v ? new Date(v).getTime() : 0);

/** Convertit une exception Postgres "raise exception 'CODE'" en GameError */
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    const code = res.error.message.match(
      /NO_BOOSTER|NOT_ENOUGH_COINS|NOT_ENOUGH_CARDS|TRADE_INVALID|FRIEND_INVALID|NOT_FOUND/,
    )?.[0] as GameError["code"] | undefined;
    if (code === "FRIEND_INVALID") throw new GameError(code, FRIEND_MESSAGES(res.error.message));
    if (code) throw new GameError(code, MESSAGES[code]);
    throw new Error(res.error.message);
  }
  return res.data as T;
}

const MESSAGES: Record<GameError["code"], string> = {
  NO_BOOSTER: "Aucun booster disponible",
  NOT_ENOUGH_COINS: "Pas assez de pièces",
  NOT_ENOUGH_CARDS: "Cartes insuffisantes",
  TRADE_INVALID: "Échange introuvable ou déjà traité",
  FRIEND_INVALID: "Demande d'ami impossible",
  NOT_FOUND: "Introuvable",
};

function FRIEND_MESSAGES(raw: string) {
  if (raw.includes("déjà amis")) return "Vous êtes déjà amis";
  if (raw.includes("déjà envoyée")) return "Demande déjà envoyée";
  if (raw.includes("liste pleine")) return "Liste d'amis pleine";
  if (raw.includes("soi-même")) return "Tu ne peux pas t'ajouter toi-même";
  return MESSAGES.FRIEND_INVALID;
}

const PROFILE_COLS = "id, username, avatar, booster_anchor, bonus_boosters, created_at, wallet(coins)";

function toProfile(r: any): Profile {
  const wallet = Array.isArray(r.wallet) ? r.wallet[0] : r.wallet;
  return {
    id: r.id,
    username: r.username,
    avatar: r.avatar,
    boosterAnchor: ts(r.booster_anchor),
    bonusBoosters: r.bonus_boosters,
    coins: wallet?.coins ?? 0,
    createdAt: ts(r.created_at),
  };
}

const toCard = (r: any): OwnedCard => ({
  cardId: r.card_id,
  setId: r.set_id,
  quantity: r.quantity,
  firstObtainedAt: ts(r.first_obtained_at),
});

const toTrade = (r: any): Trade => ({
  id: r.id,
  fromUser: r.from_user,
  toUser: r.to_user,
  offerCardId: r.offer_card_id,
  requestCardId: r.request_card_id,
  status: r.status,
  createdAt: ts(r.created_at),
  resolvedAt: r.resolved_at ? ts(r.resolved_at) : null,
});

const toOpening = (r: any): Opening => ({
  id: r.id,
  userId: r.user_id,
  setId: r.set_id,
  cards: r.cards as DrawnCard[],
  value: r.value,
  source: r.source,
  createdAt: ts(r.created_at),
});

/** Supabase pagine à 1000 lignes : on boucle pour tout récupérer */
async function selectAll(build: (from: number, to: number) => PromiseLike<any>): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(await build(from, from + 999)) as any[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

export const supabaseStore: Store = {
  async getProfile(id) {
    const r = check(await db().from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle());
    return r ? toProfile(r) : null;
  },

  async ensureProfile(id, username, avatar = null) {
    const existing = await this.getProfile(id);
    if (existing) return existing;
    const base = (username || "Dresseur").replace(/[^\p{L}\p{N}_-]/gu, "").slice(0, 18) || "Dresseur";
    for (let attempt = 0; attempt < 5; attempt++) {
      const name = attempt === 0 ? base : `${base}${Math.floor(Math.random() * 10000)}`;
      const { error } = await db()
        .from("profiles")
        .insert({ id, username: name, avatar, booster_anchor: new Date(initialAnchor()).toISOString() });
      if (!error) {
        await db().from("wallet").insert({ user_id: id, coins: GAME.startingCoins });
        return (await this.getProfile(id))!;
      }
      if (!error.message.includes("username")) {
        // conflit sur l'id : créé en parallèle par une autre requête
        const again = await this.getProfile(id);
        if (again) return again;
        throw new Error(error.message);
      }
    }
    throw new Error("Impossible de créer le profil");
  },

  async getProfiles(ids) {
    // Les ids peuvent venir d'une URL : un id non-UUID ferait échouer toute la requête
    const valid = ids.filter((id) => UUID_RE.test(id));
    if (!valid.length) return [];
    return check(await db().from("profiles").select(PROFILE_COLS).in("id", valid)).map(toProfile);
  },

  async searchProfiles(q, limit = 10) {
    const safe = q.replace(/[%_,()]/g, "");
    return check(
      await db().from("profiles").select(PROFILE_COLS).ilike("username", `%${safe}%`).limit(limit),
    ).map(toProfile);
  },

  async getUserCards(userId, setId) {
    const rows = await selectAll((from, to) => {
      let q = db().from("user_cards").select("*").eq("user_id", userId).gt("quantity", 0);
      if (setId) q = q.eq("set_id", setId);
      return q.range(from, to);
    });
    return rows.map(toCard);
  },

  async getUserCard(userId, cardId) {
    const r: any = check(
      await db().from("user_cards").select("*").eq("user_id", userId).eq("card_id", cardId).maybeSingle(),
    );
    return r && r.quantity > 0 ? toCard(r) : null;
  },

  async cardOwners(cardId, limit = 20) {
    return check(
      await db()
        .from("user_cards")
        .select("user_id, quantity")
        .eq("card_id", cardId)
        .gt("quantity", 0)
        .order("quantity", { ascending: false })
        .limit(limit),
    ).map((r: any) => ({ userId: r.user_id, quantity: r.quantity }));
  },

  async commitOpening(userId, setId, cards, value) {
    const res = check(
      await db().rpc("commit_opening", {
        p_user: userId,
        p_set_id: setId,
        p_cards: cards,
        p_value: value,
        p_interval_seconds: BOOSTER_INTERVAL_MS / 1000,
        p_max: GAME.maxStoredBoosters,
      }),
    ) as { openingId: string; source: "free" | "bonus"; newCardIds: string[] };
    return {
      opening: { id: res.openingId, userId, setId, cards, value, source: res.source, createdAt: Date.now() },
      newCardIds: res.newCardIds,
    };
  },

  async listOpenings(userId, limit = 20) {
    return check(
      await db()
        .from("openings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ).map(toOpening);
  },

  async sellCards(userId, items) {
    return check(await db().rpc("sell_cards", { p_user: userId, p_items: items })) as {
      earned: number;
      coins: number;
    };
  },

  async buyBonusBooster(userId, price) {
    check(await db().rpc("buy_bonus_booster", { p_user: userId, p_price: price }));
    return (await this.getProfile(userId))!;
  },

  async createTrade(fromUser, toUser, offerCardId, requestCardId) {
    if (fromUser === toUser) throw new GameError("TRADE_INVALID", "Impossible d'échanger avec soi-même");
    const [mine, theirs] = await Promise.all([
      this.getUserCard(fromUser, offerCardId),
      this.getUserCard(toUser, requestCardId),
    ]);
    if (!mine) throw new GameError("NOT_ENOUGH_CARDS", "Tu ne possèdes pas cette carte");
    if (!theirs) throw new GameError("NOT_ENOUGH_CARDS", "Ce joueur ne possède pas cette carte");
    const r = check(
      await db()
        .from("trades")
        .insert({ from_user: fromUser, to_user: toUser, offer_card_id: offerCardId, request_card_id: requestCardId })
        .select()
        .single(),
    );
    return toTrade(r);
  },

  async listTrades(userId) {
    return check(
      await db()
        .from("trades")
        .select("*")
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100),
    ).map(toTrade);
  },

  async respondTrade(tradeId, userId, accept) {
    check(await db().rpc("respond_trade", { p_trade: tradeId, p_user: userId, p_accept: accept }));
    return toTrade(check(await db().from("trades").select("*").eq("id", tradeId).single()));
  },

  async cancelTrade(tradeId, userId) {
    const r = check(
      await db()
        .from("trades")
        .update({ status: "cancelled", resolved_at: new Date().toISOString() })
        .eq("id", tradeId)
        .eq("from_user", userId)
        .eq("status", "pending")
        .select()
        .maybeSingle(),
    );
    if (!r) throw new GameError("TRADE_INVALID", MESSAGES.TRADE_INVALID);
    return toTrade(r);
  },

  async getAchievements(userId) {
    return check(
      await db().from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
    ).map((r: any) => ({ id: r.achievement_id, unlockedAt: ts(r.unlocked_at) }));
  },

  async unlockAchievements(userId, ids) {
    if (!ids.length) return;
    check(
      await db()
        .from("user_achievements")
        .upsert(
          ids.map((id) => ({ user_id: userId, achievement_id: id })),
          { onConflict: "user_id,achievement_id", ignoreDuplicates: true },
        ),
    );
  },

  async getStats(userId) {
    const count = async (q: PromiseLike<{ count: number | null; error: any }>) => (await q).count ?? 0;
    const [openings, sales, tradesDone] = await Promise.all([
      count(db().from("openings").select("id", { count: "exact", head: true }).eq("user_id", userId)),
      count(db().from("sales").select("id", { count: "exact", head: true }).eq("user_id", userId)),
      count(
        db()
          .from("trades")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`from_user.eq.${userId},to_user.eq.${userId}`),
      ),
    ]);
    return { openings, sales, tradesDone };
  },

  async leaderboardRows() {
    const rows = await selectAll((from, to) => db().rpc("leaderboard_rows").range(from, to));
    return rows.map((r) => ({ userId: r.user_id, setId: r.set_id, unique: Number(r.uniq), total: Number(r.total) }));
  },

  async listFriendships(userId) {
    const rows = check(
      await db().from("friendships").select("*").or(`requester.eq.${userId},addressee.eq.${userId}`).limit(500),
    );
    return rows.map((r: any) => ({
      userId: r.requester === userId ? r.addressee : r.requester,
      status: r.status,
      direction: r.requester === userId ? "outgoing" : "incoming",
      createdAt: ts(r.created_at),
    }));
  },

  async sendFriendRequest(from, to) {
    return check(await db().rpc("send_friend_request", { p_from: from, p_to: to, p_max: 200 })) as "sent" | "accepted";
  },

  async respondFriendRequest(userId, from, accept) {
    const q = db().from("friendships");
    const res = accept
      ? await q.update({ status: "accepted" }).eq("requester", from).eq("addressee", userId).eq("status", "pending").select()
      : await q.delete().eq("requester", from).eq("addressee", userId).eq("status", "pending").select();
    if (!check(res)?.length) throw new GameError("FRIEND_INVALID", "Demande introuvable");
  },

  async removeFriend(userId, other) {
    check(
      await db()
        .from("friendships")
        .delete()
        .or(`and(requester.eq.${userId},addressee.eq.${other}),and(requester.eq.${other},addressee.eq.${userId})`),
    );
  },
};
