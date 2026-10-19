// Raretés : on regroupe les libellés TCGdex (FR) en "paliers" qui pilotent
// le tirage, le tri, le prix de revente et les effets visuels.

export type Tier =
  | "common"
  | "uncommon"
  | "rare"
  | "holo"
  | "ace"
  | "radiant"
  | "double"
  | "shiny"
  | "ultra"
  | "illus"
  | "shinyUltra"
  | "special"
  | "hyper"
  | "megaHyper";

/** Ordre croissant de rareté */
export const TIER_ORDER: Tier[] = [
  "common",
  "uncommon",
  "rare",
  "holo",
  "ace",
  "radiant",
  "double",
  "shiny",
  "ultra",
  "illus",
  "shinyUltra",
  "special",
  "hyper",
  "megaHyper",
];

export const RARITY_TO_TIER: Record<string, Tier> = {
  Commune: "common",
  "Peu Commune": "uncommon",
  Rare: "rare",
  Promo: "rare",
  "Sans Rareté": "common",
  "Holo Rare": "holo",
  "Rare Holo": "holo",
  "HIGH-TECH rare": "ace",
  "Radieux Rare": "radiant",
  "Double rare": "double",
  "Holo Rare V": "double",
  "Holo Rare VMAX": "double",
  "Holo Rare VSTAR": "double",
  "Rare Holo LV.X": "double",
  "Rare Prime": "double",
  LÉGENDE: "ultra",
  "Shiny rare": "shiny",
  "Shiny rare V": "shiny",
  "Shiny rare VMAX": "shiny",
  "Ultra Rare": "ultra",
  "Dresseur Full Art": "ultra",
  "Rare Noir Blanc": "ultra",
  "Illustration rare": "illus",
  "Chromatique ultra rare": "shinyUltra",
  "Illustration spéciale rare": "special",
  "Magnifique rare": "hyper",
  "Hyper rare": "hyper",
  "Méga Hyper Rare": "megaHyper",

  // Anciennes ères et cas particuliers
  Magnifique: "radiant", // Amazing Rare (Voltage Éclatant…)
  "Collection Classique": "ultra",
  "Pikachu Rare": "ultra",
  "RGB Rare": "ultra",
  "Futuristic Rare": "ultra",
  "Mega Attack Rare": "illus",
  "Secret Rare": "hyper",

  // Libellés anglais (sets jamais sortis en français)
  Common: "common",
  Uncommon: "uncommon",
  None: "common",
  "Rare Holo EX": "ultra",
  "Rare Holo GX": "ultra",
  "Rare Holo V": "double",
  "Rare Holo VMAX": "double",
  "Rare Holo VSTAR": "double",
  "Rare Holo Star": "shiny",
  "Rare Shining": "shiny",
  "Rare Shiny": "shiny",
  "Rare Prism Star": "radiant",
  "Rare BREAK": "double",
  "Rare Ultra": "ultra",
  "Rare Secret": "hyper",
  "Rare Rainbow": "hyper",
  LEGEND: "ultra",
  "Amazing Rare": "radiant",
  "Radiant Rare": "radiant",
  "ACE SPEC Rare": "ace",
  "Illustration Rare": "illus",
  "Special Illustration Rare": "special",
  "Hyper Rare": "hyper",

  // Pokémon TCG Pocket
  "Un Diamant": "common",
  "Deux Diamants": "uncommon",
  "Trois Diamants": "rare",
  "Quatre Diamants": "double",
  "Une Étoile": "illus",
  "Deux Étoiles": "special",
  "Trois Étoiles": "hyper",
  Couronne: "megaHyper",
  "Un Chromatique": "shiny",
  "Deux Chromatiques": "shinyUltra",
};

export function tierOf(rarity: string): Tier {
  return RARITY_TO_TIER[rarity] ?? "rare";
}

export function tierRank(t: Tier) {
  return TIER_ORDER.indexOf(t);
}

/** Niveau d'effet visuel à l'ouverture */
export type FxLevel = 0 | 1 | 2 | 3;
export function fxLevel(t: Tier, reverse = false): FxLevel {
  const r = tierRank(t);
  if (r >= tierRank("special")) return 3; // animation spéciale
  if (r >= tierRank("double")) return 2; // flash + particules
  if (r >= tierRank("holo") || reverse) return 1; // brillance holo
  return 0;
}

/** Prix de revente (pièces) par palier */
export const SELL_PRICE: Record<Tier, number> = {
  common: 5,
  uncommon: 10,
  rare: 25,
  holo: 40,
  ace: 80,
  radiant: 80,
  double: 60,
  shiny: 120,
  ultra: 150,
  illus: 200,
  shinyUltra: 500,
  special: 600,
  hyper: 1000,
  megaHyper: 2500,
};

export function cardValue(rarity: string, reverse = false) {
  return SELL_PRICE[tierOf(rarity)] + (reverse ? 5 : 0);
}

/** Couleur d'accent par palier (UI) */
export const TIER_COLOR: Record<Tier, string> = {
  common: "#94a3b8",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  holo: "#38bdf8",
  ace: "#f472b6",
  radiant: "#fb923c",
  double: "#a78bfa",
  shiny: "#2dd4bf",
  ultra: "#c084fc",
  illus: "#f472b6",
  shinyUltra: "#22d3ee",
  special: "#facc15",
  hyper: "#fbbf24",
  megaHyper: "#f43f5e",
};

/** Libellé court (pastilles) */
export const TIER_LABEL: Record<Tier, string> = {
  common: "Commune",
  uncommon: "Peu commune",
  rare: "Rare",
  holo: "Rare holo",
  ace: "High-Tech",
  radiant: "Radieuse",
  double: "Double rare",
  shiny: "Chromatique",
  ultra: "Ultra rare",
  illus: "Illustration rare",
  shinyUltra: "Chroma ultra",
  special: "Illus. spéciale",
  hyper: "Hyper rare",
  megaHyper: "Méga hyper",
};
