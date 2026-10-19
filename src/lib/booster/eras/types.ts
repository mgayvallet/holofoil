import type { Tier } from "../rarity";

/** Résultat possible d'un slot : un tirage parmi les cartes de ces paliers */
export interface SlotPool {
  tiers: Tier[];
  /** Carte tirée en version Reverse (parmi celles qui ont la variante) */
  reverse?: boolean;
  /** Cartes des sous-sets fusionnés (Galerie de Dresseurs, Coffre Étincelant…) */
  subset?: boolean;
  /** Toutes les cartes du set, pondérées par rareté (sets promo / spéciaux) */
  all?: boolean;
}

/** Remplacement possible du contenu de base d'un slot */
export interface SlotUpgrade extends SlotPool {
  /** Probabilité d'apparition (ex : 1/13) */
  chance: number;
}

export interface SlotConfig {
  label: string;
  count: number;
  base: SlotPool;
  /** Évalués dans l'ordre ; si aucun ne tombe, on tire dans `base` */
  upgrades?: SlotUpgrade[];
}

export interface EraConfig {
  id: string;
  name: string;
  /** Séries TCGdex couvertes par cette ère */
  series: string[];
  /** Sets précis rattachés à cette ère (prioritaire sur la série) */
  sets?: string[];
  slots: SlotConfig[];
  /**
   * Ajustement des taux par set : { "sv03.5": { special: 1/20 } }
   * La clé est le premier palier de l'upgrade visé, ou "subset" pour les sous-sets.
   */
  setRates?: Record<string, Partial<Record<Tier | "subset", number>>>;
}
