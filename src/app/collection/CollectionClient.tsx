"use client";
import { useState } from "react";
import Link from "next/link";
import { TIER_COLOR, TIER_ORDER } from "@/lib/booster/rarity";
import { cardImage, imageFallback, setAsset } from "@/lib/tcgdex/ids";

export interface CollectionCard {
  id: string;
  name: string;
  image: string;
  rarity: string;
  /** Rang de rareté (plus grand = plus rare) */
  rank: number;
  quantity: number;
  setId: string;
  setName: string;
  categoryId: string;
  release: string;
  localId: string;
}

export interface CollectionCategory {
  id: string;
  name: string;
  years: string;
  owned: number;
  total: number;
  sets: { id: string; name: string; logo?: string; owned: number; total: number }[];
}

const PAGE = 60;

export function CollectionClient({
  categories,
  cards,
  initialCategory,
}: {
  categories: CollectionCategory[];
  cards: CollectionCard[];
  initialCategory: string;
}) {
  const [cat, setCat] = useState(initialCategory);
  const [limit, setLimit] = useState(PAGE);

  const select = (id: string) => {
    setCat(id);
    setLimit(PAGE);
    // L'URL garde la catégorie choisie (partage, retour arrière)
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("categorie");
    else url.searchParams.set("categorie", id);
    window.history.replaceState(null, "", url);
  };

  const current = categories.find((c) => c.id === cat);
  const shown = cat === "all" ? cards : cards.filter((c) => c.categoryId === cat);
  const totalOwned = categories.reduce((n, c) => n + c.owned, 0);
  const totalCards = categories.reduce((n, c) => n + c.total, 0);

  const option = (id: string, name: string, owned: number, total: number) => {
    const active = cat === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => select(id)}
        aria-pressed={active}
        className={`press shrink-0 rounded-2xl px-4 py-2 text-left border ${
          active ? "bg-text text-surface border-text" : "bg-surface border-line"
        }`}
      >
        <span className="block font-bold text-sm whitespace-nowrap">{name}</span>
        <span className={`block text-xs tabular-nums ${active ? "opacity-80" : "text-muted"}`}>
          {owned.toLocaleString("fr-FR")}/{total.toLocaleString("fr-FR")}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Mêmes catégories (noms, ordre, nombre) que les boosters */}
      <nav aria-label="Catégories du classeur" className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max pb-1">
          {option("all", "Toutes", totalOwned, totalCards)}
          {categories.map((c) => option(c.id, c.name, c.owned, c.total))}
        </div>
      </nav>

      <section aria-labelledby="cards-title">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 id="cards-title" className="font-display font-bold text-2xl">
            {current ? current.name : "Toutes mes cartes"}
          </h2>
          <p className="text-sm text-muted font-bold">
            {shown.length.toLocaleString("fr-FR")} carte{shown.length > 1 ? "s" : ""} · plus rares d&apos;abord
          </p>
        </div>

        {shown.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-center text-muted">
            Aucune carte ici pour l&apos;instant.{" "}
            <Link href={current ? `/ouvrir/${current.id}` : "/"} className="font-bold text-pink underline">
              Ouvre un booster {current?.name ?? ""}
            </Link>
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {shown.slice(0, limit).map((c) => {
                const tier = TIER_ORDER[c.rank];
                return (
                  <li key={c.id}>
                    <Link href={`/carte/${c.id}`} className="press block relative">
                      <div
                        className="aspect-[63/88] rounded-[6px] overflow-hidden bg-surface"
                        style={c.rank >= TIER_ORDER.indexOf("double") ? { boxShadow: `0 0 14px -2px ${TIER_COLOR[tier]}` } : undefined}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={cardImage(c.image, "low")}
                          alt={`${c.name} — ${c.rarity}, ${c.setName}${c.quantity > 1 ? `, ${c.quantity} exemplaires` : ""}`}
                          loading="lazy"
                          onError={imageFallback(c.id)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {c.quantity > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-poke text-white text-xs font-bold px-1.5 py-0.5 shadow">
                          ×{c.quantity}
                        </span>
                      )}
                      <span className="mt-1 flex items-center gap-1 text-xs font-bold truncate">
                        <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TIER_COLOR[tier] }} />
                        <span className="truncate">{c.rarity}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {shown.length > limit && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE * 2)}
                className="press mt-4 w-full glass rounded-2xl min-h-12 font-bold"
              >
                Voir plus ({(shown.length - limit).toLocaleString("fr-FR")} restantes)
              </button>
            )}
          </>
        )}
      </section>

      {current && (
        <section aria-labelledby="sets-title">
          <h2 id="sets-title" className="font-display font-bold text-xl mb-2">
            Les {current.sets.length} sets · {current.years}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {current.sets.map((s) => {
              const pct = s.total ? Math.floor((s.owned / s.total) * 100) : 0;
              return (
                <li key={s.id}>
                  <Link
                    href={`/collection/${s.id}`}
                    className={`press glass rounded-2xl p-3 flex items-center gap-3 ${s.owned === 0 ? "opacity-70" : ""}`}
                  >
                    <div className="w-20 h-12 shrink-0 grid place-items-center">
                      {s.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={setAsset(s.logo)} alt="" className="max-h-12 max-w-20 object-contain" loading="lazy" />
                      ) : (
                        <span aria-hidden className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate">{s.name}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-surface-2 overflow-hidden">
                          <div className={pct >= 100 ? "h-full bg-good" : "h-full bg-cyan"} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold tabular-nums text-muted">
                          {s.owned}/{s.total}
                        </span>
                      </div>
                    </div>
                    {pct >= 100 && <span aria-label="Set complet">🏆</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
