import "server-only";
import { cached, DAY } from "./cache";
import type { CardLite, SetSnapshot, SetSummary, TcgCard, TcgSerie, TcgSet } from "./types";
import { SUBSETS_OF, setIdFromCardId } from "./ids";
import { isExcludedSet } from "@/lib/booster/eras";
import { ptcgImage } from "./pokemontcg";
export { setIdFromCardId, cardImage } from "./ids";

const BASE = "https://api.tcgdex.net/v2";
type Lang = "fr" | "en";

export class NotFoundError extends Error {}

async function get<T>(lang: Lang, path: string, attempt = 0): Promise<T> {
  let res: Response | null = null;
  try {
    res = await fetch(`${BASE}/${lang}${path}`, { cache: "no-store" });
  } catch {
    res = null; // erreur réseau : on retente
  }
  if (res?.status === 404) throw new NotFoundError(path);
  if (!res?.ok) {
    // L'API renvoie des 503 quand on la sollicite trop : on recule progressivement
    if (attempt < 6) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return get<T>(lang, path, attempt + 1);
    }
    throw new Error(`TCGdex ${res?.status ?? "réseau"} sur ${path}`);
  }
  return res.json() as Promise<T>;
}

async function getOrNull<T>(lang: Lang, path: string): Promise<T | null> {
  try {
    return await get<T>(lang, path);
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

/** Exécute `fn` sur chaque élément avec une concurrence limitée */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

interface IndexedSet {
  id: string;
  serieId: string;
  serieName: string;
  name: string;
  /** Le set existe-t-il dans la base française de TCGdex ? */
  fr: boolean;
  en: boolean;
  logo?: string;
}

/** Tous les sets de TCGdex (FR + EN, y compris ceux jamais sortis en français) */
function getSetIndex(): Promise<IndexedSet[]> {
  return cached("sets:index:v2", DAY, async () => {
    const out = new Map<string, IndexedSet>();
    for (const lang of ["fr", "en"] as const) {
      const series = await get<{ id: string; name: string }[]>(lang, "/series");
      const details = await pool(series, 3, (s) => getOrNull<TcgSerie>(lang, `/series/${s.id}`));
      for (const serie of details) {
        if (!serie) continue;
        for (const set of serie.sets) {
          const cur = out.get(set.id);
          if (cur) {
            cur[lang] = true;
            cur.logo ??= set.logo;
            continue;
          }
          out.set(set.id, {
            id: set.id,
            serieId: serie.id,
            serieName: serie.name,
            name: set.name,
            fr: lang === "fr",
            en: lang === "en",
            logo: set.logo,
          });
        }
      }
    }
    return [...out.values()];
  });
}

/** Détail d'un set dans la meilleure langue disponible */
async function fetchSet(entry: IndexedSet): Promise<TcgSet | null> {
  return (entry.fr ? await getOrNull<TcgSet>("fr", `/sets/${entry.id}`) : null) ??
    (entry.en ? await getOrNull<TcgSet>("en", `/sets/${entry.id}`) : null);
}

/** Tous les sets ouvrables, de toutes les générations, du plus récent au plus ancien */
export function getPlayableSets(): Promise<SetSummary[]> {
  return cached("sets:playable:v2", DAY, async () => {
    const index = await getSetIndex();
    const byId = new Map(index.map((s) => [s.id, s]));
    const main = index.filter((s) => !isExcludedSet(s));
    const details = await pool(main, 4, async (entry) => {
      const set = await fetchSet(entry).catch(() => null);
      if (!set) return null;
      // Les cartes des sous-sets fusionnés comptent dans le total
      let total = set.cards.length;
      for (const sub of SUBSETS_OF[entry.id] ?? []) {
        const subEntry = byId.get(sub);
        const subSet = subEntry ? await fetchSet(subEntry).catch(() => null) : null;
        total += subSet?.cards.length ?? 0;
      }
      if (!total) return null;
      const summary: SetSummary = {
        id: set.id,
        name: set.name,
        serieId: entry.serieId,
        serieName: entry.serieName,
        logo: set.logo ?? entry.logo,
        symbol: set.symbol,
        releaseDate: set.releaseDate,
        total,
      };
      return summary;
    });
    return details
      .filter((s): s is SetSummary => s !== null)
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  });
}

export async function getSetSummary(setId: string): Promise<SetSummary | null> {
  const sets = await getPlayableSets();
  return sets.find((s) => s.id === setId) ?? null;
}

/** Séries où TCGdex note "Rare" les rares holo comme les rares simples */
const HOLO_SPLIT_SERIES = new Set(["base", "gym", "neo", "lc", "ecard", "ex", "pop", "dp", "pl", "hgss", "col", "bw", "xy", "sm"]);

function normalizeRarity(card: TcgCard | null, serieId: string): string {
  const rarity = card?.rarity ?? "Sans Rareté";
  // Une "Rare" qui n'existe qu'en holo est une Rare holo (Dracaufeu du Set de Base…)
  if (rarity === "Rare" && HOLO_SPLIT_SERIES.has(serieId) && card?.variants?.holo && !card.variants.normal) {
    return "Holo Rare";
  }
  return rarity;
}

/** Cartes d'un set (ou sous-set) avec la meilleure image disponible */
async function snapshotCards(entry: IndexedSet, subset: boolean): Promise<{ set: TcgSet | null; cards: CardLite[] }> {
  const fr = entry.fr ? await getOrNull<TcgSet>("fr", `/sets/${entry.id}`) : null;
  const en = entry.en ? await getOrNull<TcgSet>("en", `/sets/${entry.id}`) : null;
  const base = fr ?? en;
  if (!base) return { set: null, cards: [] };
  const enImages = new Map((en?.cards ?? []).filter((c) => c.image).map((c) => [c.localId, c.image!]));

  const cards = await pool(base.cards, 6, async (brief): Promise<CardLite> => {
    const lang: Lang = fr ? "fr" : "en";
    const card =
      (await getOrNull<TcgCard>(lang, `/cards/${encodeURIComponent(brief.id)}`).catch(() => null)) ??
      (lang === "fr" ? await getOrNull<TcgCard>("en", `/cards/${encodeURIComponent(brief.id)}`).catch(() => null) : null);

    // Cascade d'images : TCGdex (langue du set) → TCGdex anglais → pokemontcg.io → carte générée
    let image = card?.image ?? brief.image;
    let imageLang: CardLite["imageLang"] = fr ? "fr" : "en";
    if (!image && enImages.has(brief.localId)) {
      image = enImages.get(brief.localId);
      imageLang = "en";
    }
    if (!image) {
      const ptcg = await ptcgImage(entry.id, brief.localId);
      image = ptcg ?? `gen:${brief.id}`;
      imageLang = ptcg ? "en" : "none";
    }

    return {
      id: brief.id,
      localId: brief.localId,
      name: card?.name ?? brief.name,
      image,
      imageLang,
      rarity: normalizeRarity(card, entry.serieId),
      category: card?.category ?? "Pokémon",
      types: card?.types ?? [],
      hp: card?.hp,
      reverse: Boolean(card?.variants?.reverse),
      holo: Boolean(card?.variants?.holo),
      ...(subset ? { subset: true } : {}),
    };
  });
  return { set: base, cards };
}

/**
 * Snapshot complet d'un set (+ ses sous-sets fusionnés) : toutes les cartes avec rareté,
 * types, variantes et image. Construit une fois, puis servi depuis le cache 7 jours.
 */
export function getSetSnapshot(setId: string): Promise<SetSnapshot> {
  return cached(`set:${setId}:v3`, 7 * DAY, async () => {
    const index = await getSetIndex();
    const byId = new Map(index.map((s) => [s.id, s]));
    const entry = byId.get(setId);
    if (!entry) throw new NotFoundError(setId);

    const { set, cards } = await snapshotCards(entry, false);
    if (!set) throw new NotFoundError(setId);
    for (const sub of SUBSETS_OF[setId] ?? []) {
      const subEntry = byId.get(sub);
      if (subEntry) cards.push(...(await snapshotCards(subEntry, true)).cards);
    }

    return {
      id: set.id,
      name: set.name,
      serieId: entry.serieId,
      serieName: entry.serieName,
      logo: set.logo ?? entry.logo,
      symbol: set.symbol,
      releaseDate: set.releaseDate,
      official: set.cardCount.official,
      total: cards.length,
      cards,
      fetchedAt: Date.now(),
    };
  });
}

/** Version compacte d'une carte depuis le snapshot de son set */
export async function getCardLite(cardId: string): Promise<CardLite | null> {
  const snap = await getSetSnapshot(setIdFromCardId(cardId)).catch(() => null);
  return snap?.cards.find((c) => c.id === cardId) ?? null;
}

/** Fiche complète d'une carte (FR, sinon EN) */
export function getCardDetail(cardId: string): Promise<TcgCard> {
  return cached(`card:${cardId}:v2`, 7 * DAY, async () => {
    const path = `/cards/${encodeURIComponent(cardId)}`;
    const card = (await getOrNull<TcgCard>("fr", path)) ?? (await getOrNull<TcgCard>("en", path));
    if (!card) throw new NotFoundError(cardId);
    if (!card.image) {
      const en = await getOrNull<TcgCard>("en", path).catch(() => null);
      if (en?.image) card.image = en.image;
    }
    return card;
  });
}
