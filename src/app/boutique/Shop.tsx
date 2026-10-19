"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { buyBoosterAction, sellAction } from "@/app/actions";
import { tierOf, TIER_COLOR } from "@/lib/booster/rarity";
import { cardImage } from "@/lib/tcgdex/ids";
import { Coin } from "@/components/Coin";
import { useToast } from "@/components/Toasts";

interface Dup {
  cardId: string;
  name: string;
  image: string;
  rarity: string;
  quantity: number;
  sellable: number;
  unitPrice: number;
}

export function Shop({
  coins,
  unlimited,
  bonusBoosters,
  price,
  duplicates,
}: {
  coins: number;
  /** Compte de démo : pièces illimitées */
  unlimited: boolean;
  bonusBoosters: number;
  price: number;
  duplicates: Dup[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [earnedFx, setEarnedFx] = useState<number | null>(null);
  const total = duplicates.reduce((s, d) => s + d.sellable * d.unitPrice, 0);

  const celebrate = (achievements: { icon: string; title: string }[]) =>
    achievements.forEach((a) => toast({ icon: a.icon, title: "Succès débloqué !", body: a.title, tone: "achievement" }));

  const sell = (items: { cardId: string; quantity: number }[] | "all") =>
    start(async () => {
      const res = await sellAction(items);
      if (!res.ok) return toast({ icon: "⚠️", title: res.error, tone: "error" });
      setEarnedFx(res.data.earned);
      setTimeout(() => setEarnedFx(null), 1400);
      celebrate(res.data.newAchievements);
      router.refresh();
    });

  const buy = () =>
    start(async () => {
      const res = await buyBoosterAction();
      if (!res.ok) return toast({ icon: "🪙", title: res.error, tone: "error" });
      toast({ icon: "📦", title: "Booster bonus ajouté !", body: "Il t'attend sur l'accueil.", tone: "success" });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <header className="glass rounded-3xl p-5 relative overflow-hidden">
        <p className="text-xs text-muted font-bold uppercase tracking-wider">Mon portefeuille</p>
        <p className="font-display font-bold text-4xl flex items-center gap-2 mt-1">
          <Coin className="w-7 h-7" /> {unlimited ? "∞" : coins.toLocaleString("fr-FR")}
          {unlimited && <span className="sr-only">pièces illimitées</span>}
        </p>
        <p className="text-xs text-muted mt-1">
          {unlimited ? "Compte de démo : pièces illimitées. " : ""}Monnaie virtuelle, non convertible. Aucun achat en argent réel.
        </p>
        <AnimatePresence>
          {earnedFx !== null && (
            <motion.p
              className="absolute right-5 top-5 font-display font-bold text-2xl text-volt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: -10 }}
              exit={{ opacity: 0, y: -30 }}
            >
              +{earnedFx}
            </motion.p>
          )}
        </AnimatePresence>
      </header>

      <section className="glass rounded-3xl p-5 flex items-center gap-4">
        <div className="text-5xl">📦</div>
        <div className="flex-1">
          <p className="font-display font-bold">Booster bonus</p>
          <p className="text-xs text-muted">
            S&apos;ajoute à ton stock, sans limite. {bonusBoosters > 0 && `Tu en as ${bonusBoosters}.`}
          </p>
        </div>
        <button
          onClick={buy}
          disabled={pending || (!unlimited && coins < price)}
          className="press rounded-2xl bg-brand px-4 py-3 font-black text-ink flex items-center gap-1.5 disabled:opacity-40"
        >
          <Coin /> {unlimited ? "Gratuit" : price}
        </button>
      </section>

      <section>
        <div className="flex items-end justify-between mb-3 gap-3">
          <div>
            <h2 className="font-display font-bold text-xl">Mes doublons</h2>
            <p className="text-xs text-muted">Tu gardes toujours au moins un exemplaire.</p>
          </div>
          {duplicates.length > 0 && (
            <button
              onClick={() => sell("all")}
              disabled={pending}
              className="press shrink-0 rounded-2xl bg-volt text-ink px-4 py-2.5 font-black text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              Tout vendre · <Coin /> {total.toLocaleString("fr-FR")}
            </button>
          )}
        </div>

        {duplicates.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center">
            <p className="text-4xl">🃏</p>
            <p className="font-bold mt-2">Aucun doublon pour l&apos;instant</p>
            <Link href="/" className="text-sm text-pink font-bold">
              Ouvre des boosters →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li key={d.cardId} className="glass rounded-2xl p-2.5 flex items-center gap-3">
                <Link href={`/carte/${d.cardId}`} className="press w-12 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardImage(d.image, "low")} alt="" className="rounded-[4px] w-full" loading="lazy" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{d.name}</p>
                  <p className="text-xs font-bold" style={{ color: TIER_COLOR[tierOf(d.rarity)] }}>
                    {d.rarity}
                  </p>
                  <p className="text-xs text-muted">
                    ×{d.quantity} · {d.sellable} à vendre
                  </p>
                </div>
                <button
                  onClick={() => sell([{ cardId: d.cardId, quantity: 1 }])}
                  disabled={pending}
                  className="press rounded-xl bg-surface-2 px-3 py-2 text-xs font-black flex items-center gap-1 disabled:opacity-50"
                >
                  Vendre 1 · <Coin className="w-3 h-3" /> {d.unitPrice}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
