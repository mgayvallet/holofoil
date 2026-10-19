import type { EraConfig } from "./types";

/**
 * Ère Épée et Bouclier — 10 cartes :
 * 5 Communes, 3 Peu communes, 1 Reverse (peut devenir Radieuse / Chromatique),
 * 1 slot Rare (Rare, Rare holo, V/VMAX/VSTAR, Full Art, Secrète).
 */
export const swordShield: EraConfig = {
  id: "swsh",
  name: "Épée et Bouclier",
  series: ["swsh"],
  slots: [
    { label: "Commune", count: 5, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 3, base: { tiers: ["uncommon"] } },
    {
      label: "Reverse",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare", "holo"], reverse: true },
      upgrades: [
        // Galerie de Dresseurs / Galerie Galaroise / Coffre Étincelant (sous-sets fusionnés)
        { tiers: [], subset: true, chance: 1 / 7 },
        { tiers: ["radiant"], chance: 1 / 20 },
        { tiers: ["shiny"], chance: 1 / 10 },
      ],
    },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["hyper"], chance: 1 / 50 },
        { tiers: ["ultra"], chance: 1 / 24 },
        { tiers: ["double"], chance: 1 / 7 },
        { tiers: ["holo"], chance: 1 / 3 },
      ],
    },
  ],
  setRates: {
    // Zénith Suprême / Pokémon GO / La Voie du Maître : sets spéciaux plus généreux
    "swsh12.5": { ultra: 1 / 12, subset: 1 / 4 },
    "swsh4.5": { subset: 1 / 4 },
    "swsh3.5": { double: 1 / 4 },
  },
};
