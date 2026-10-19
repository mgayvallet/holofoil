/**
 * Sous-sets qui sortaient dans les boosters d'un set parent :
 * leurs cartes sont fusionnées dans le classeur et les boosters du parent.
 */
export const SUBSET_PARENT: Record<string, string> = {
  swsh9tg: "swsh9",
  swsh10tg: "swsh10",
  swsh11tg: "swsh11",
  swsh12tg: "swsh12",
  "swsh12.5gg": "swsh12.5",
  "swsh4.5sv": "swsh4.5",
  sma: "sm115",
  cel25cc: "cel25",
  "30th-c": "30th",
  rc: "bw11", // Radiant Collection dans Legendary Treasures
};

export const SUBSETS_OF: Record<string, string[]> = Object.entries(SUBSET_PARENT).reduce(
  (acc, [sub, parent]) => ({ ...acc, [parent]: [...(acc[parent] ?? []), sub] }),
  {} as Record<string, string[]>,
);

/** Id TCGdex brut du set d'une carte (« sv03.5-025 » → « sv03.5 ») */
export function rawSetId(cardId: string) {
  return cardId.slice(0, cardId.lastIndexOf("-"));
}

/** Set "de classeur" d'une carte : les sous-sets sont rattachés à leur parent */
export function setIdFromCardId(cardId: string) {
  const raw = rawSetId(cardId);
  return SUBSET_PARENT[raw] ?? raw;
}

/**
 * Image d'une carte. Le champ `image` peut être :
 *  - une URL de base TCGdex   → `${base}/high.webp` | `${base}/low.webp`
 *  - "ptcg:<set>/<numéro>"    → images.pokemontcg.io (repli quand TCGdex n'a pas l'image)
 *  - "gen:<cardId>"           → carte de remplacement générée (aucune image nulle part)
 */
export function cardImage(image: string, size: "high" | "low" = "high") {
  if (image.startsWith("ptcg:")) {
    const path = image.slice(5);
    return `https://images.pokemontcg.io/${path}${size === "high" ? "_hires" : ""}.png`;
  }
  if (image.startsWith("gen:")) return `/carte-image/${encodeURIComponent(image.slice(4))}`;
  return `${image}/${size}.webp`;
}

/** Logo / symbole de set : le .png existe toujours (le .webp manque sur certains sets récents) */
export function setAsset(base: string | undefined) {
  return base ? `${base}.png` : undefined;
}

/** Si une image distante est introuvable, on affiche la carte de remplacement générée */
export function imageFallback(cardId: string) {
  return (e: { currentTarget: HTMLImageElement }) => {
    const img = e.currentTarget;
    const fallback = cardImage(`gen:${cardId}`);
    if (!img.src.endsWith(fallback)) img.src = fallback;
  };
}
