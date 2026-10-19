// Configuration globale du jeu. Tout ce qui touche à l'équilibrage est ici.

export const GAME = {
  /** Un booster gratuit toutes les X minutes */
  boosterIntervalMinutes: 10,
  /** Nombre max de boosters gratuits stockables */
  maxStoredBoosters: 15,
  /** Boosters disponibles à la création du compte */
  startingBoosters: 15,
  /** Pièces offertes à l'inscription */
  startingCoins: 200,
  /** Prix d'un booster bonus en boutique */
  bonusBoosterPrice: 150,
} as const;

export const BOOSTER_INTERVAL_MS = GAME.boosterIntervalMinutes * 60_000;

/** Mode Supabase si les variables sont présentes, sinon mode démo local (fichier JSON). */
export function isSupabaseMode(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export const APP_NAME = "Holofoil";

/** Compte de démo créé automatiquement en développement (npm run dev) */
export const DEMO_ACCOUNT = {
  username: process.env.DEMO_USERNAME ?? "demo",
  password: process.env.DEMO_PASSWORD ?? "pokemon-demo",
};
