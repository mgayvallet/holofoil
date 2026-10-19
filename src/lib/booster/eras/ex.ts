import type { EraConfig } from "./types";

/**
 * Ère e-Card et EX (2002-2007) — 9 cartes : 5 Communes, 2 Peu communes,
 * 1 Reverse holo, 1 Rare (Rare holo ~1/3, Pokémon-ex ~1/12, Étoile ~1/36).
 */
export const exEra: EraConfig = {
  id: "ex",
  name: "e-Card et EX",
  series: ["ecard", "ex"],
  slots: [
    { label: "Commune", count: 5, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 2, base: { tiers: ["uncommon"] } },
    {
      label: "Reverse",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare", "holo"], reverse: true },
    },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["hyper"], chance: 1 / 72 },
        { tiers: ["shiny"], chance: 1 / 36 }, // Pokémon Étoile / Gold Star
        { tiers: ["ultra"], chance: 1 / 12 }, // Pokémon-ex
        { tiers: ["double"], chance: 1 / 12 },
        { tiers: ["holo"], chance: 1 / 3 },
      ],
    },
  ],
};
