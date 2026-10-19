import "server-only";
import { cached, DAY } from "./cache";

/**
 * Repli d'images via pokemontcg.io (images anglaises) pour les sets où TCGdex
 * n'a aucune image : Légendes Brillantes, Majesté des Dragons, Galeries de Dresseurs,
 * Coffres Étincelants, kits du dresseur, McDonald's…
 */

/** Ids TCGdex → ids pokemontcg.io quand ils diffèrent */
const OVERRIDES: Record<string, string> = {
  "sm3.5": "sm35",
  "sm7.5": "sm75",
  "swsh3.5": "swsh35",
  "swsh4.5": "swsh45",
  "swsh4.5sv": "swsh45sv",
  "swsh10.5": "pgo",
  "swsh12.5": "swsh12pt5",
  "swsh12.5gg": "swsh12pt5gg",
  "sv10.5b": "zsv10pt5",
  "sv10.5w": "rsv10pt5",
  "30th": "me55",
  "30th-c": "me55c",
  cel25cc: "cel25c",
  lc: "base6",
  hgssp: "hsp",
  fut2020: "fut20",
  "tk-ex-latia": "tk1a",
  "tk-ex-latio": "tk1b",
  "tk-ex-p": "tk2a",
  "tk-ex-m": "tk2b",
  "2011bw": "mcd11",
  "2012bw": "mcd12",
  "2014xy": "mcd14",
  "2015xy": "mcd15",
  "2016xy": "mcd16",
  "2017sm": "mcd17",
  "2018sm": "mcd18",
  "2019sm": "mcd19",
  "2021swsh": "mcd21",
  "2022swsh": "mcd22",
};

export function ptcgSetId(tcgdexId: string) {
  if (OVERRIDES[tcgdexId]) return OVERRIDES[tcgdexId];
  // sv03.5 → sv3pt5, me02.5 → me2pt5, sv01 → sv1
  return tcgdexId.replace(/^(sv|me)0(\d)/, "$1$2").replace(/\.5$/, "pt5");
}

function getPtcgSetIds(): Promise<string[]> {
  return cached("ptcg:sets:v1", 7 * DAY, async () => {
    const res = await fetch("https://api.pokemontcg.io/v2/sets?pageSize=250&select=id", { cache: "no-store" });
    if (!res.ok) throw new Error(`pokemontcg.io ${res.status}`);
    const json = (await res.json()) as { data: { id: string }[] };
    return json.data.map((s) => s.id);
  });
}

/** "ptcg:<set>/<numéro>" si le set existe chez pokemontcg.io, sinon null */
export async function ptcgImage(tcgdexSetId: string, localId: string): Promise<string | null> {
  let ids: string[];
  try {
    ids = await getPtcgSetIds();
  } catch {
    return null;
  }
  const set = ptcgSetId(tcgdexSetId);
  if (!ids.includes(set)) return null;
  const number = /^\d+$/.test(localId) ? String(Number(localId)) : localId;
  return `ptcg:${set}/${number}`;
}
