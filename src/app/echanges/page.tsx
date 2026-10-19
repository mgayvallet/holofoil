import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { hydrateCards } from "@/lib/game/service";
import { TradeList, type TradeView } from "./TradeList";

export const metadata = { title: "Échanges" };
export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const profile = await requireProfile();
  const trades = await store().listTrades(profile.id);
  const userIds = [...new Set(trades.flatMap((t) => [t.fromUser, t.toUser]))];
  const [profiles, cards] = await Promise.all([
    store().getProfiles(userIds),
    hydrateCards(trades.flatMap((t) => [t.offerCardId, t.requestCardId])),
  ]);
  const names = new Map(profiles.map((p) => [p.id, p.username]));

  const view = (cardId: string) => {
    const c = cards.get(cardId);
    return { id: cardId, name: c?.name ?? cardId, image: c?.image ?? null, rarity: c?.rarity ?? "" };
  };

  const items: TradeView[] = trades.map((t) => ({
    id: t.id,
    status: t.status,
    incoming: t.toUser === profile.id,
    other: names.get(t.toUser === profile.id ? t.fromUser : t.toUser) ?? "Joueur",
    // Du point de vue du joueur connecté : ce qu'il donne / ce qu'il reçoit
    give: view(t.toUser === profile.id ? t.requestCardId : t.offerCardId),
    get: view(t.toUser === profile.id ? t.offerCardId : t.requestCardId),
    createdAt: t.createdAt,
  }));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl">Échanges</h1>
          <p className="text-muted text-sm">Une carte contre une carte, entre dresseurs.</p>
        </div>
        <Link href="/echanges/nouveau" className="press rounded-2xl bg-brand px-4 py-3 font-black text-ink text-sm shrink-0">
          + Proposer
        </Link>
      </header>
      <TradeList trades={items} />
    </div>
  );
}
