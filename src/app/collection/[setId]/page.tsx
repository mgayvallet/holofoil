import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { getSetSnapshot, getSetSummary } from "@/lib/tcgdex/api";
import { setAsset } from "@/lib/tcgdex/ids";
import { Binder, type BinderCard } from "./Binder";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/collection/[setId]">) {
  const { setId } = await params;
  const s = await getSetSummary(setId);
  return { title: s ? `Classeur · ${s.name}` : "Classeur" };
}

export default async function SetBinderPage({ params }: PageProps<"/collection/[setId]">) {
  const { setId } = await params;
  const profile = await requireProfile();
  const summary = await getSetSummary(setId);
  if (!summary) notFound();
  const [snap, owned] = await Promise.all([getSetSnapshot(setId), store().getUserCards(profile.id, setId)]);
  const qty = new Map(owned.map((o) => [o.cardId, o.quantity]));

  const cards: BinderCard[] = snap.cards
    .map((c) => ({ ...c, quantity: qty.get(c.id) ?? 0 }))
    .sort((a, b) => a.localId.localeCompare(b.localId, "fr", { numeric: true }));
  const ownedCount = cards.filter((c) => c.quantity > 0).length;
  const pct = Math.floor((ownedCount / cards.length) * 100);

  return (
    <div className="space-y-5">
      <Link href="/collection" className="press inline-flex text-sm font-bold text-muted">
        ← Classeur
      </Link>
      <header className="glass rounded-3xl p-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={setAsset(snap.logo)} alt="" className="h-14 max-w-28 object-contain" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted font-bold">{snap.serieName}</p>
          <h1 className="font-display font-bold text-xl truncate">{snap.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2.5 flex-1 rounded-full bg-surface-2 overflow-hidden">
              <div className={pct >= 100 ? "h-full bg-good" : "h-full bg-cyan"} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-display font-bold text-sm tabular-nums">{pct}%</span>
          </div>
          <p className="mt-1 text-xs text-muted font-bold">
            {ownedCount} / {cards.length} cartes
          </p>
        </div>
      </header>
      <Binder cards={cards} />
    </div>
  );
}
