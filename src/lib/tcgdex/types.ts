// Types bruts renvoyés par l'API TCGdex (sous-ensemble utile)

export interface TcgCardBrief {
  id: string;
  localId: string;
  name: string;
  image?: string;
}

export interface TcgSetBrief {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  cardCount: { total: number; official: number };
}

export interface TcgSerie {
  id: string;
  name: string;
  logo?: string;
  sets: TcgSetBrief[];
}

export interface TcgSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  serie: { id: string; name: string };
  cardCount: { total: number; official: number; holo?: number; reverse?: number; normal?: number };
  cards: TcgCardBrief[];
}

export interface TcgAttack {
  name: string;
  cost?: string[];
  effect?: string;
  damage?: number | string;
}

export interface TcgCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: string;
  illustrator?: string;
  rarity: string;
  hp?: number;
  types?: string[];
  stage?: string;
  evolveFrom?: string;
  description?: string;
  suffix?: string;
  effect?: string;
  trainerType?: string;
  energyType?: string;
  abilities?: { type: string; name: string; effect: string }[];
  attacks?: TcgAttack[];
  weaknesses?: { type: string; value?: string }[];
  resistances?: { type: string; value?: string }[];
  retreat?: number;
  regulationMark?: string;
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean; firstEdition?: boolean };
  set: { id: string; name: string; logo?: string; symbol?: string };
}

// ---- Formes compactes stockées dans notre cache ----

/** Carte compacte, suffisante pour le tirage, le classeur et les filtres */
export interface CardLite {
  id: string;
  localId: string;
  name: string;
  /** Image : URL de base TCGdex, "ptcg:…" ou "gen:…" (voir cardImage) */
  image: string;
  /** Langue réelle de l'image (fallback anglais possible) */
  imageLang: "fr" | "en" | "none";
  rarity: string;
  category: string;
  types: string[];
  hp?: number;
  reverse: boolean;
  holo: boolean;
  /** Carte d'un sous-set fusionné (Galerie de Dresseurs, Coffre Étincelant…) */
  subset?: boolean;
}

export interface SetSnapshot {
  id: string;
  name: string;
  serieId: string;
  serieName: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  official: number;
  total: number;
  cards: CardLite[];
  fetchedAt: number;
}

export interface SetSummary {
  id: string;
  name: string;
  serieId: string;
  serieName: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  total: number;
}
