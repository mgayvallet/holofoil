import { scarletViolet } from "./scarlet-violet";
import { swordShield } from "./sword-shield";
import { sunMoon } from "./sun-moon";
import { blackWhiteXY } from "./black-white-xy";
import { diamondPearl } from "./diamond-pearl";
import { exEra } from "./ex";
import { wizards } from "./wizards";
import { pocket } from "./pocket";
import { special } from "./special";
import type { EraConfig } from "./types";
import { SUBSET_PARENT } from "@/lib/tcgdex/ids";

/** Une config de booster par ère, de 1999 à aujourd'hui */
export const ERAS: EraConfig[] = [
  special,
  scarletViolet,
  swordShield,
  sunMoon,
  blackWhiteXY,
  diamondPearl,
  exEra,
  wizards,
  pocket,
];

export function eraFor(setId: string, serieId: string): EraConfig {
  return (
    ERAS.find((e) => e.sets?.includes(setId)) ??
    ERAS.find((e) => e.series.includes(serieId)) ??
    special
  );
}


/** Nombre de cartes d'un booster du set */
export function packSize(setId: string, serieId: string) {
  return eraFor(setId, serieId).slots.reduce((n, s) => n + s.count, 0);
}

/** Les sous-sets n'ont pas de booster propre : ils sont fusionnés dans leur parent */
export function isExcludedSet(set: { id: string }) {
  return set.id in SUBSET_PARENT;
}

export type { EraConfig } from "./types";
