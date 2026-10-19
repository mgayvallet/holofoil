import { BOOSTER_INTERVAL_MS, GAME } from "@/lib/config";

/**
 * Recharge des boosters gratuits via une "ancre" temporelle :
 * boosters dispo = floor((now - ancre) / intervalle), plafonné au max stockable.
 * Ouvrir un booster avance l'ancre d'un intervalle. Aucun cron nécessaire.
 * (La même logique est dupliquée dans la fonction SQL `commit_opening`.)
 */

export function availableBoosters(anchor: number, now = Date.now()): number {
  return Math.max(0, Math.min(GAME.maxStoredBoosters, Math.floor((now - anchor) / BOOSTER_INTERVAL_MS)));
}

/** Ancre après consommation d'un booster (suppose availableBoosters >= 1) */
export function consumeAnchor(anchor: number, now = Date.now()): number {
  const floor = now - GAME.maxStoredBoosters * BOOSTER_INTERVAL_MS;
  return Math.max(anchor, floor) + BOOSTER_INTERVAL_MS;
}

/** Timestamp auquel le prochain booster sera disponible (null si stock plein) */
export function nextBoosterAt(anchor: number, now = Date.now()): number | null {
  if (availableBoosters(anchor, now) >= GAME.maxStoredBoosters) return null;
  const elapsed = now - anchor;
  return anchor + (Math.floor(elapsed / BOOSTER_INTERVAL_MS) + 1) * BOOSTER_INTERVAL_MS;
}

export function initialAnchor(now = Date.now()) {
  return now - GAME.startingBoosters * BOOSTER_INTERVAL_MS;
}

export interface TimerState {
  available: number;
  max: number;
  bonus: number;
  nextAt: number | null;
  serverNow: number;
}

export function timerState(anchor: number, bonus: number, now = Date.now()): TimerState {
  return {
    available: availableBoosters(anchor, now),
    max: GAME.maxStoredBoosters,
    bonus,
    nextAt: nextBoosterAt(anchor, now),
    serverNow: now,
  };
}
