import type { EraConfig } from "./types";

/**
 * Sets sans vrais boosters de 10 cartes : promos Black Star, McDonald's, kits du dresseur,
 * énergies, POP, coffrets… Booster "collection" de 5 cartes tirées dans tout le set,
 * les plus rares étant moins fréquentes (pondération par rareté).
 */
export const special: EraConfig = {
  id: "special",
  name: "Collections spéciales",
  series: ["misc", "pop", "tk", "mc"],
  sets: [
    "basep", "wp", "np", "dpp", "hgssp", "bwp", "xyp", "smp", "swshp", "svp", "mep",
    "sve", "mee", "xya", "jumbo", "fut2020", "mfb", "det1", "ru1", "si1", "dc1", "xy0", "exu",
    "bog", "sp", "cel25", "30th",
  ],
  slots: [{ label: "Carte", count: 5, base: { tiers: [], all: true } }],
};
