import type { DrawnCard } from "@/lib/booster/draw";

export interface Profile {
  id: string;
  username: string;
  avatar: string | null;
  /** Ancre du timer de boosters (ms epoch) */
  boosterAnchor: number;
  bonusBoosters: number;
  coins: number;
  createdAt: number;
}

export interface OwnedCard {
  cardId: string;
  setId: string;
  quantity: number;
  firstObtainedAt: number;
}

export interface Opening {
  id: string;
  userId: string;
  setId: string;
  cards: DrawnCard[];
  value: number;
  source: "free" | "bonus";
  createdAt: number;
}

export type TradeStatus = "pending" | "accepted" | "declined" | "cancelled" | "failed";

export interface Trade {
  id: string;
  fromUser: string;
  toUser: string;
  offerCardId: string;
  requestCardId: string;
  status: TradeStatus;
  createdAt: number;
  resolvedAt: number | null;
}

export interface SellItem {
  cardId: string;
  quantity: number;
  unitPrice: number;
}

export interface LeaderboardRow {
  userId: string;
  setId: string;
  unique: number;
  total: number;
}

export interface Friendship {
  /** L'autre joueur */
  userId: string;
  status: "pending" | "accepted";
  /** pending : demande reçue (incoming) ou envoyée (outgoing) */
  direction: "incoming" | "outgoing";
  createdAt: number;
}

export interface UserStats {
  openings: number;
  sales: number;
  tradesDone: number;
}

export class GameError extends Error {
  constructor(
    public code:
      | "NO_BOOSTER"
      | "NOT_ENOUGH_COINS"
      | "NOT_ENOUGH_CARDS"
      | "TRADE_INVALID"
      | "FRIEND_INVALID"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

export interface Store {
  getProfile(userId: string): Promise<Profile | null>;
  /** Crée le profil s'il n'existe pas (pseudo unique ajusté si besoin) */
  ensureProfile(userId: string, username: string, avatar?: string | null): Promise<Profile>;
  getProfiles(ids: string[]): Promise<Profile[]>;
  searchProfiles(query: string, limit?: number): Promise<Profile[]>;

  getUserCards(userId: string, setId?: string): Promise<OwnedCard[]>;
  getUserCard(userId: string, cardId: string): Promise<OwnedCard | null>;
  /** Joueurs qui possèdent une carte (pour proposer un échange) */
  cardOwners(cardId: string, limit?: number): Promise<{ userId: string; quantity: number }[]>;

  /**
   * Atomique : consomme un booster (gratuit d'abord, puis bonus), ajoute les cartes,
   * enregistre l'ouverture. Renvoie les ids des cartes obtenues pour la 1re fois.
   */
  commitOpening(
    userId: string,
    setId: string,
    cards: DrawnCard[],
    value: number,
  ): Promise<{ opening: Opening; newCardIds: string[] }>;
  listOpenings(userId: string, limit?: number): Promise<Opening[]>;

  /** Vend des doublons (on garde toujours au moins 1 exemplaire) */
  sellCards(userId: string, items: SellItem[]): Promise<{ earned: number; coins: number }>;
  buyBonusBooster(userId: string, price: number): Promise<Profile>;

  createTrade(fromUser: string, toUser: string, offerCardId: string, requestCardId: string): Promise<Trade>;
  listTrades(userId: string): Promise<Trade[]>;
  respondTrade(tradeId: string, userId: string, accept: boolean): Promise<Trade>;
  cancelTrade(tradeId: string, userId: string): Promise<Trade>;

  getAchievements(userId: string): Promise<{ id: string; unlockedAt: number }[]>;
  unlockAchievements(userId: string, ids: string[]): Promise<void>;
  getStats(userId: string): Promise<UserStats>;

  leaderboardRows(): Promise<LeaderboardRow[]>;

  // ---------- Amis ----------
  listFriendships(userId: string): Promise<Friendship[]>;
  /** Envoie une demande ; si l'autre avait déjà demandé, l'amitié est acceptée */
  sendFriendRequest(from: string, to: string): Promise<"sent" | "accepted">;
  respondFriendRequest(userId: string, from: string, accept: boolean): Promise<void>;
  /** Retire un ami, annule une demande envoyée ou refuse une demande reçue */
  removeFriend(userId: string, other: string): Promise<void>;
}
