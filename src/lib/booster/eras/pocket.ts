import type { EraConfig } from "./types";

/**
 * Pokémon TCG Pocket — 5 cartes. Cartes 1 à 3 : ◆ ; cartes 4 et 5 : taux officiels
 * affichés dans le jeu (◆◆, ◆◆◆, ◆◆◆◆, ☆, ☆☆, ☆☆☆, couronne, chromatiques).
 */
export const pocket: EraConfig = {
  id: "tcgp",
  name: "Pokémon TCG Pocket",
  series: ["tcgp"],
  slots: [
    { label: "◆", count: 3, base: { tiers: ["common"] } },
    {
      label: "4e carte",
      count: 1,
      base: { tiers: ["uncommon"] },
      upgrades: [
        { tiers: ["megaHyper"], chance: 0.0004 },
        { tiers: ["hyper"], chance: 0.00222 },
        { tiers: ["shinyUltra"], chance: 0.00333 },
        { tiers: ["special"], chance: 0.005 },
        { tiers: ["shiny"], chance: 0.00714 },
        { tiers: ["double"], chance: 0.01666 },
        { tiers: ["illus"], chance: 0.02572 },
        { tiers: ["rare"], chance: 0.05 },
      ],
    },
    {
      label: "5e carte",
      count: 1,
      base: { tiers: ["uncommon"] },
      upgrades: [
        { tiers: ["megaHyper"], chance: 0.0016 },
        { tiers: ["hyper"], chance: 0.00888 },
        { tiers: ["shinyUltra"], chance: 0.01333 },
        { tiers: ["special"], chance: 0.02 },
        { tiers: ["shiny"], chance: 0.02857 },
        { tiers: ["double"], chance: 0.06664 },
        { tiers: ["illus"], chance: 0.10288 },
        { tiers: ["rare"], chance: 0.2 },
      ],
    },
  ],
};
