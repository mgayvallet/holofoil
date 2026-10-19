import { DEMO_ACCOUNT, isSupabaseMode } from "@/lib/config";
import { localUserId } from "@/lib/session";

/** Le compte de démo (mode local) a des pièces illimitées : ses achats ne coûtent rien */
export function hasUnlimitedCoins(profileId: string) {
  return !isSupabaseMode() && profileId === localUserId(DEMO_ACCOUNT.username);
}

/** Solde affiché : "∞" pour le compte de démo */
export function formatCoins(profileId: string, coins: number) {
  return hasUnlimitedCoins(profileId) ? "∞" : coins.toLocaleString("fr-FR");
}
