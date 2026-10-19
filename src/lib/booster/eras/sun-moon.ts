import type { EraConfig } from "./types";

/**
 * Ère Soleil et Lune — 10 cartes :
 * 5 Communes, 3 Peu communes, 1 Reverse, 1 slot Rare (Rare/Rare holo, GX & Full Art, Secrète).
 */
export const sunMoon: EraConfig = {
  id: "sm",
  name: "Soleil et Lune",
  series: ["sm"],
  slots: [
    { label: "Commune", count: 5, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 3, base: { tiers: ["uncommon"] } },
    {
      label: "Reverse",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare", "holo"], reverse: true },
      upgrades: [
        { tiers: [], subset: true, chance: 1 / 4 }, // Coffre Étincelant de Destinées Occultes
        { tiers: ["radiant"], chance: 1 / 20 }, // Prisme Étoile
        { tiers: ["shiny"], chance: 1 / 8 },
      ],
    },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["hyper"], chance: 1 / 36 },
        { tiers: ["ultra"], chance: 1 / 8 },
        { tiers: ["double"], chance: 1 / 10 },
        { tiers: ["holo"], chance: 1 / 3 },
      ],
    },
  ],
};
