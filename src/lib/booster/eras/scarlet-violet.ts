import type { EraConfig } from "./types";

/**
 * Ère Écarlate et Violet (et Méga-Évolution, même structure) — 10 cartes :
 * 4 Communes, 3 Peu communes, 2 Reverse (le 2e peut devenir une Illustration rare,
 * Illustration spéciale rare ou Hyper rare), 1 Rare garantie.
 */
export const scarletViolet: EraConfig = {
  id: "sv",
  name: "Écarlate et Violet",
  series: ["sv", "me"],
  slots: [
    { label: "Commune", count: 4, base: { tiers: ["common"] } },
    { label: "Peu commune", count: 3, base: { tiers: ["uncommon"] } },
    {
      label: "Reverse",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare"], reverse: true },
      upgrades: [
        { tiers: ["ace"], chance: 1 / 20 },
        { tiers: ["shiny"], chance: 1 / 12 },
      ],
    },
    {
      label: "Reverse / Illustration",
      count: 1,
      base: { tiers: ["common", "uncommon", "rare"], reverse: true },
      upgrades: [
        { tiers: ["megaHyper"], chance: 1 / 400 },
        { tiers: ["hyper"], chance: 1 / 60 },
        { tiers: ["shinyUltra"], chance: 1 / 58 },
        { tiers: ["special"], chance: 1 / 32 },
        { tiers: ["illus"], chance: 1 / 13 },
      ],
    },
    {
      label: "Rare",
      count: 1,
      base: { tiers: ["rare"] },
      upgrades: [
        { tiers: ["ultra"], chance: 1 / 15 },
        { tiers: ["double"], chance: 1 / 6 },
      ],
    },
  ],
  setRates: {
    // 151 : Illustrations spéciales un peu plus fréquentes
    "sv03.5": { special: 1 / 24 },
    // Évolutions Prismatiques : pas d'Illustration rare, beaucoup d'ISR
    "sv08.5": { special: 1 / 18 },
    // Destinées de Paldea : énormément de chromatiques
    "sv04.5": { shiny: 1 / 4, shinyUltra: 1 / 40 },
  },
};
