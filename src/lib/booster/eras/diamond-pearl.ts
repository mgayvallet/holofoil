import type { EraConfig } from "./types";

/**
 * Ères Diamant & Perle, Platine, HeartGold SoulSilver, L'appel des Légendes (2007-2011)
 * — 10 cartes : 5 Communes, 3 Peu communes, 1 Reverse, 1 Rare
 * (Rare holo ~1/3, Niv.X / Prime ~1/12, LÉGENDE ~1/36, secrète ~1/72).
 */
export const diamondPearl: EraConfig = {
  id: "dp",
  name: "Diamant & Perle / HGSS",
  series: ["dp", "pl", "hgss", "col"],
  slots: [
    { label: "Commune", count: 5, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 3, base: { tiers: ["uncommon"] } },
    {
      label: "Reverse",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare", "holo"], reverse: true },
      upgrades: [{ tiers: ["shiny"], chance: 1 / 40 }],
    },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["hyper"], chance: 1 / 72 },
        { tiers: ["ultra"], chance: 1 / 36 }, // LÉGENDE
        { tiers: ["double"], chance: 1 / 12 }, // Niv.X, Prime
        { tiers: ["holo"], chance: 1 / 3 },
      ],
    },
  ],
};
