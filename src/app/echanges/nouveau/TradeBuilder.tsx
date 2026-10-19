"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { proposeTradeAction } from "@/app/actions";
import { tierOf, TIER_COLOR } from "@/lib/booster/rarity";
import { cardImage } from "@/lib/tcgdex/ids";
import { useToast } from "@/components/Toasts";

export interface PickCard {
  id: string;
  name: string;
  image: string;
  rarity: string;
  quantity: number;
  /** Carte que je n'ai pas encore */
  missing: boolean;
}

function Grid({
  cards,
  selected,
  onSelect,
  empty,
}: {
  cards: PickCard[];
  selected: string | null;
  onSelect: (id: string) => void;
  empty: string;
}) {
  if (!cards.length) return <p className="text-sm text-muted py-4">{empty}</p>;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[46dvh] overflow-y-auto p-1">
      {cards.map((c) => {
        const active = selected === c.id;
        return (
          <button key={c.id} onClick={() => onSelect(c.id)} className="press relative text-left">
            <motion.div
              animate={{ scale: active ? 1.04 : 1 }}
              className={`rounded-[6px] overflow-hidden ring-2 ${active ? "ring-volt" : "ring-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardImage(c.image, "low")} alt={c.name} loading="lazy" className="w-full" />
            </motion.div>
            {c.missing && (
              <span className="absolute -top-1 -left-1 rounded-full bg-volt text-ink text-[11px] font-black px-1.5 py-0.5">
                MANQUE
              </span>
            )}
            {c.quantity > 1 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-poke text-white text-[11px] font-black px-1.5 py-0.5">
                ×{c.quantity}
              </span>
            )}
            <span
              className="absolute bottom-1 left-1 h-2 w-2 rounded-full ring-2 ring-bg"
              style={{ background: TIER_COLOR[tierOf(c.rarity)] }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function TradeBuilder({
  partnerId,
  mine,
  theirs,
  initialWanted,
}: {
  partnerId: string;
  mine: PickCard[];
  theirs: PickCard[];
  initialWanted: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [want, setWant] = useState<string | null>(theirs.some((c) => c.id === initialWanted) ? initialWanted : null);
  const [give, setGive] = useState<string | null>(null);
  const [tab, setTab] = useState<"want" | "give">(want ? "give" : "want");

  const wantCard = theirs.find((c) => c.id === want);
  const giveCard = mine.find((c) => c.id === give);

  const submit = () =>
    start(async () => {
      if (!want || !give) return;
      const res = await proposeTradeAction(partnerId, give, want);
      if (!res.ok) return toast({ icon: "⚠️", title: res.error, tone: "error" });
      toast({ icon: "📨", title: "Proposition envoyée !", tone: "success" });
      router.push("/echanges");
    });

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-4 flex items-center gap-3">
        {[
          { label: "Tu donnes", card: giveCard, t: "give" as const },
          { label: "Tu reçois", card: wantCard, t: "want" as const },
        ].map((slot, i) => (
          <div key={slot.t} className="contents">
            {i === 1 && <span className="text-2xl">⇄</span>}
            <button onClick={() => setTab(slot.t)} className="press flex-1 text-center">
              <p className="text-xs font-black uppercase tracking-wider text-muted mb-1">{slot.label}</p>
              <div
                className={`w-20 mx-auto aspect-[63/88] rounded-[6px] overflow-hidden grid place-items-center border-2 border-dashed ${
                  tab === slot.t ? "border-pink" : "border-line"
                }`}
              >
                {slot.card ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cardImage(slot.card.image, "low")} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-muted">?</span>
                )}
              </div>
              <p className="text-xs font-bold mt-1 truncate">{slot.card?.name ?? "Choisir"}</p>
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 rounded-2xl bg-surface-2 p-1 text-sm font-bold">
        <button onClick={() => setTab("want")} className={`press rounded-xl py-2 ${tab === "want" ? "bg-surface" : "text-muted"}`}>
          Ses cartes
        </button>
        <button onClick={() => setTab("give")} className={`press rounded-xl py-2 ${tab === "give" ? "bg-surface" : "text-muted"}`}>
          Mes cartes
        </button>
      </div>

      {tab === "want" ? (
        <Grid
          cards={theirs}
          selected={want}
          onSelect={(id) => {
            setWant(id);
            if (!give) setTab("give");
          }}
          empty="Ce joueur n'a pas encore de cartes."
        />
      ) : (
        <Grid
          cards={mine}
          selected={give}
          onSelect={(id) => {
            setGive(id);
            if (!want) setTab("want");
          }}
          empty="Tu n'as pas encore de cartes."
        />
      )}

      <button
        onClick={submit}
        disabled={!want || !give || pending}
        className="press w-full rounded-2xl bg-brand py-4 font-display font-bold text-ink disabled:opacity-40 sticky bottom-24"
      >
        Proposer l&apos;échange
      </button>
    </div>
  );
}
