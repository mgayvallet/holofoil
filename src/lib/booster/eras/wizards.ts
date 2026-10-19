import type { EraConfig } from "./types";

/**
 * Ère Wizards of the Coast (1999-2003) : Set de Base, Jungle, Fossile, Team Rocket,
 * Gym, Neo, Legendary Collection — 11 cartes : 7 Communes, 3 Peu communes,
 * 1 Rare (Rare holo environ 1 booster sur 3).
 */
export const wizards: EraConfig = {
  id: "wotc",
  name: "Wizards of the Coast",
  series: ["base", "gym", "neo", "lc"],
  slots: [
    { label: "Commune", count: 7, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 3, base: { tiers: ["uncommon"] } },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["shiny"], chance: 1 / 40 }, // Shining (Neo)
        { tiers: ["holo"], chance: 1 / 3 },
      ],
    },
  ],
};
