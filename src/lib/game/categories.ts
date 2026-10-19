import "server-only";
import { eraFor, packSize } from "@/lib/booster/eras";
import { getPlayableSets } from "@/lib/tcgdex/api";
import type { SetSummary } from "@/lib/tcgdex/types";

/**
 * Un booster par catégorie (≈ une génération / série du JCC) plutôt qu'un par set.
 * Ouvrir le booster d'une catégorie tire au hasard l'un de ses sets (pondéré par le
 * nombre de cartes) puis applique les vraies règles de booster de ce set.
 */

/** Noms français des catégories (TCGdex renvoie parfois le nom anglais) */
const NAMES: Record<string, string> = {
  me: "Méga-Évolution",
  sv: "Écarlate et Violet",
  swsh: "Épée et Bouclier",
  sm: "Soleil et Lune",
  xy: "XY",
  bw: "Noir & Blanc",
  hgss: "HeartGold SoulSilver",
  pl: "Platine",
  dp: "Diamant & Perle",
  ex: "EX",
  ecard: "e-Card",
  neo: "Neo",
  gym: "Gym",
  base: "Set de Base",
  tcgp: "Pokémon TCG Pocket",
  special: "Promos & collections",
};

/** Petites séries d'un seul set rattachées à leur époque */
const MERGE: Record<string, string> = {
  col: "hgss", // L'appel des Légendes
  lc: "base", // Legendary Collection
};

export interface Category {
  id: string;
  name: string;
  sets: SetSummary[];
  total: number;
  /** Logo et années, pour l'affichage */
  logo?: string;
  years: string;
  packSize: number;
  latest: string;
}

export function categoryIdOf(set: Pick<SetSummary, "id" | "serieId">) {
  if (eraFor(set.id, set.serieId).id === "special") return "special";
  return MERGE[set.serieId] ?? set.serieId;
}

export async function getCategories(): Promise<Category[]> {
  const sets = await getPlayableSets();
  const map = new Map<string, SetSummary[]>();
  for (const s of sets) {
    const id = categoryIdOf(s);
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(s);
  }

  const cats = [...map].map(([id, list]): Category => {
    const dates = list.map((s) => s.releaseDate ?? "").filter(Boolean).sort();
    const first = dates[0]?.slice(0, 4);
    const last = dates.at(-1)?.slice(0, 4);
    // Logo : celui du 1er set de la génération (souvent du même nom : « Écarlate et Violet »…)
    const withLogo = list
      .filter((s) => s.logo)
      .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));
    return {
      id,
      name: NAMES[id] ?? list[0].serieName,
      sets: list,
      total: list.reduce((n, s) => n + s.total, 0),
      logo: id === "special" ? undefined : withLogo[0]?.logo,
      years: first && last && first !== last ? `${first}–${last}` : (first ?? ""),
      packSize: id === "special" ? 5 : packSize(list[0].id, list[0].serieId),
      latest: dates.at(-1) ?? "",
    };
  });

  // Du plus récent au plus ancien ; Pocket (jeu numérique) puis les promos à la fin
  const tail = (id: string) => (id === "special" ? 2 : id === "tcgp" ? 1 : 0);
  return cats.sort((a, b) => tail(a.id) - tail(b.id) || b.latest.localeCompare(a.latest));
}

export async function getCategory(id: string) {
  return (await getCategories()).find((c) => c.id === id) ?? null;
}

/** Choisit le set d'où sortira le booster (pondéré par le nombre de cartes du set) */
export function pickSet(category: Category, rng: () => number): SetSummary {
  let r = rng() * category.total;
  for (const s of category.sets) {
    r -= s.total;
    if (r < 0) return s;
  }
  return category.sets[category.sets.length - 1];
}
