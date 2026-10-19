"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { tierOf, tierRank, TIER_COLOR, TIER_LABEL, TIER_ORDER, type Tier } from "@/lib/booster/rarity";
import { cardImage, imageFallback } from "@/lib/tcgdex/ids";
import type { CardLite } from "@/lib/tcgdex/types";

export interface BinderCard extends CardLite {
  quantity: number;
}

type OwnFilter = "all" | "owned" | "missing" | "dupes";

export function Binder({ cards }: { cards: BinderCard[] }) {
  const [own, setOwn] = useState<OwnFilter>("all");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [type, setType] = useState<string>("all");
  // Par défaut : cartes possédées de la plus rare à la moins rare, puis les manquantes par numéro
  const [sort, setSort] = useState<"rarity" | "number">("rarity");

  const tiers = useMemo(
    () => [...new Set(cards.map((c) => tierOf(c.rarity)))].sort((a, b) => tierRank(a) - tierRank(b)),
    [cards],
  );
  const types = useMemo(() => {
    const t = new Set<string>();
    cards.forEach((c) => (c.types.length ? c.types.forEach((x) => t.add(x)) : t.add(c.category)));
    return [...t].sort();
  }, [cards]);

  const filtered = cards.filter((c) => {
    if (own === "owned" && c.quantity < 1) return false;
    if (own === "missing" && c.quantity > 0) return false;
    if (own === "dupes" && c.quantity < 2) return false;
    if (tier !== "all" && tierOf(c.rarity) !== tier) return false;
    if (type !== "all" && !(c.types.includes(type) || (!c.types.length && c.category === type))) return false;
    return true;
  });

  const byNumber = (a: BinderCard, b: BinderCard) => a.localId.localeCompare(b.localId, "fr", { numeric: true });
  const shown =
    sort === "number"
      ? [...filtered].sort(byNumber)
      : [...filtered].sort(
          (a, b) =>
            Number(b.quantity > 0) - Number(a.quantity > 0) ||
            (a.quantity > 0 ? tierRank(tierOf(b.rarity)) - tierRank(tierOf(a.rarity)) : 0) ||
            byNumber(a, b),
        );

  const chip = (active: boolean) =>
    `press shrink-0 rounded-full px-3.5 py-2 text-xs font-bold border ${
      active ? "bg-text text-surface border-text" : "bg-surface border-line text-muted"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {(
          [
            ["all", "Toutes"],
            ["owned", "Obtenues"],
            ["missing", "Manquantes"],
            ["dupes", "Doublons"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setOwn(k)} className={chip(own === k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <button onClick={() => setTier("all")} className={chip(tier === "all")}>
          Toutes raretés
        </button>
        {TIER_ORDER.filter((t) => tiers.includes(t)).map((t) => (
          <button key={t} onClick={() => setTier(t)} className={chip(tier === t)}>
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: TIER_COLOR[t] }} />
            {TIER_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        <button onClick={() => setType("all")} className={chip(type === "all")}>
          Tous types
        </button>
        {types.map((t) => (
          <button key={t} onClick={() => setType(t)} className={chip(type === t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted font-bold">{shown.length} carte(s)</p>
        <div role="group" aria-label="Tri" className="flex rounded-2xl bg-surface-2 p-1 text-sm font-bold">
          {(
            [
              ["rarity", "Plus rares d'abord"],
              ["number", "Par numéro"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className={`press rounded-xl px-3 min-h-10 ${sort === k ? "bg-surface text-text shadow" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
        {shown.map((c, i) => {
          const has = c.quantity > 0;
          const t = tierOf(c.rarity);
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 24) * 0.015 }}
            >
              <Link href={`/carte/${c.id}`} className="press block relative">
                <div
                  className="relative aspect-[63/88] rounded-[6px] overflow-hidden bg-surface"
                  style={has && tierRank(t) >= tierRank("double") ? { boxShadow: `0 0 14px -2px ${TIER_COLOR[t]}` } : undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cardImage(c.image, "low")}
                    alt={has ? `${c.name} (${c.rarity}${c.quantity > 1 ? `, ${c.quantity} exemplaires` : ""})` : `Carte n°${c.localId} non obtenue`}
                    loading="lazy"
                    onError={imageFallback(c.id)}
                    className={`w-full h-full object-cover ${has ? "" : "card-missing"}`}
                  />
                  {!has && (
                    <span className="absolute inset-0 grid place-items-center font-display font-bold text-white/40 text-lg">
                      {c.localId}
                    </span>
                  )}
                </div>
                {c.quantity > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-poke text-white text-xs font-black px-1.5 py-0.5 shadow">
                    ×{c.quantity}
                  </span>
                )}
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1 h-3 w-3 rounded-full ring-2 ring-white"
                  style={{ background: TIER_COLOR[t] }}
                />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
