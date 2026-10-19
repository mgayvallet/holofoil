import type { EraConfig } from "./types";

/**
 * Ères Noir & Blanc et XY (2011-2017) — 10 cartes : 5 Communes, 3 Peu communes,
 * 1 Reverse, 1 Rare (Rare holo ~1/3, EX / TURBO ~1/9, Full Art ~1/36, secrète ~1/72).
 */
export const blackWhiteXY: EraConfig = {
  id: "bwxy",
  name: "Noir & Blanc / XY",
  series: ["bw", "xy"],
  slots: [
    { label: "Commune", count: 5, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 3, base: { tiers: ["uncommon"] } },
    {
      label: "Reverse",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare", "holo"], reverse: true },
      upgrades: [
        { tiers: [], subset: true, chance: 1 / 8 }, // Radiant Collection
        { tiers: ["radiant"], chance: 1 / 20 },
        { tiers: ["shiny"], chance: 1 / 20 },
      ],
    },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["hyper"], chance: 1 / 72 },
        { tiers: ["ultra"], chance: 1 / 9 },
        { tiers: ["double"], chance: 1 / 12 },
        { tiers: ["holo"], chance: 1 / 3 },
      ],
    },
  ],
};
