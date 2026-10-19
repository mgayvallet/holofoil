"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelTradeAction, respondTradeAction } from "@/app/actions";
import { tierOf, TIER_COLOR } from "@/lib/booster/rarity";
import { cardImage } from "@/lib/tcgdex/ids";
import { useToast } from "@/components/Toasts";
import type { TradeStatus } from "@/lib/store/types";

interface CardView {
  id: string;
  name: string;
  image: string | null;
  rarity: string;
}

export interface TradeView {
  id: string;
  status: TradeStatus;
  incoming: boolean;
  other: string;
  give: CardView;
  get: CardView;
  createdAt: number;
}

const STATUS: Record<TradeStatus, { label: string; cls: string }> = {
  pending: { label: "En attente", cls: "bg-volt/15 text-volt" },
  accepted: { label: "Accepté", cls: "bg-good/15 text-good" },
  declined: { label: "Refusé", cls: "bg-bad/15 text-bad" },
  cancelled: { label: "Annulé", cls: "bg-surface-2 text-muted" },
  failed: { label: "Impossible", cls: "bg-bad/15 text-bad" },
};

function Mini({ card, label }: { card: CardView; label: string }) {
  return (
    <Link href={`/carte/${card.id}`} className="press flex-1 min-w-0 text-center">
      <p className="text-xs font-black uppercase tracking-wider text-muted mb-1">{label}</p>
      <div className="w-20 mx-auto">
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cardImage(card.image, "low")} alt={card.name} className="rounded-[5px] w-full" loading="lazy" />
        ) : (
          <div className="aspect-[63/88] rounded-[5px] bg-surface-2" />
        )}
      </div>
      <p className="text-xs font-bold mt-1 truncate">{card.name}</p>
      <p className="text-xs font-bold truncate" style={{ color: TIER_COLOR[tierOf(card.rarity)] }}>
        {card.rarity}
      </p>
    </Link>
  );
}

export function TradeList({ trades }: { trades: TradeView[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const respond = (id: string, accept: boolean) =>
    start(async () => {
      const res = await respondTradeAction(id, accept);
      if (!res.ok) return toast({ icon: "⚠️", title: res.error, tone: "error" });
      const st = res.data.trade.status;
      toast(
        st === "accepted"
          ? { icon: "🤝", title: "Échange réalisé !", tone: "success" }
          : st === "failed"
            ? { icon: "⚠️", title: "L'autre joueur n'a plus la carte", tone: "error" }
            : { icon: "👋", title: "Échange refusé" },
      );
      res.data.newAchievements.forEach((a) =>
        toast({ icon: a.icon, title: "Succès débloqué !", body: a.title, tone: "achievement" }),
      );
      router.refresh();
    });

  const cancel = (id: string) =>
    start(async () => {
      const res = await cancelTradeAction(id);
      if (!res.ok) return toast({ icon: "⚠️", title: res.error, tone: "error" });
      router.refresh();
    });

  const groups = [
    { title: "Reçus", list: trades.filter((t) => t.status === "pending" && t.incoming) },
    { title: "Envoyés", list: trades.filter((t) => t.status === "pending" && !t.incoming) },
    { title: "Historique", list: trades.filter((t) => t.status !== "pending") },
  ];

  if (!trades.length) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-4xl">🤝</p>
        <p className="font-bold mt-2">Aucun échange pour l&apos;instant</p>
        <p className="text-sm text-muted">Trouve une carte qui te manque et propose un échange à son propriétaire.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <section key={g.title}>
              <h2 className="font-display font-bold text-lg mb-2">
                {g.title} <span className="text-muted text-sm">({g.list.length})</span>
              </h2>
              <ul className="space-y-3">
                {g.list.map((t) => (
                  <li key={t.id} className="glass rounded-3xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold">
                        {t.incoming ? "De" : "À"} <span className="text-pink">{t.other}</span>
                      </p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${STATUS[t.status].cls}`}>
                        {STATUS[t.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mini card={t.give} label="Tu donnes" />
                      <span className="text-2xl">⇄</span>
                      <Mini card={t.get} label="Tu reçois" />
                    </div>
                    {t.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        {t.incoming ? (
                          <>
                            <button
                              disabled={pending}
                              onClick={() => respond(t.id, false)}
                              className="press flex-1 rounded-2xl bg-surface-2 py-3 font-bold text-sm disabled:opacity-50"
                            >
                              Refuser
                            </button>
                            <button
                              disabled={pending}
                              onClick={() => respond(t.id, true)}
                              className="press flex-1 rounded-2xl bg-brand py-3 font-black text-ink text-sm disabled:opacity-50"
                            >
                              Accepter
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={pending}
                            onClick={() => cancel(t.id)}
                            className="press flex-1 rounded-2xl bg-surface-2 py-3 font-bold text-sm disabled:opacity-50"
                          >
                            Annuler la proposition
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}
