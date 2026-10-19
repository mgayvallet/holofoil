import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { getCollectionOverview } from "@/lib/game/service";
import { getPlayableSets } from "@/lib/tcgdex/api";
import { TIER_COLOR } from "@/lib/booster/rarity";
import { cardImage } from "@/lib/tcgdex/ids";
import { logoutAction } from "@/app/actions";
import { Coin } from "@/components/Coin";
import { formatCoins } from "@/lib/game/demo";

export const metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const p = await requireProfile();
  const [unlocked, stats, openings, overview, sets] = await Promise.all([
    store().getAchievements(p.id),
    store().getStats(p.id),
    store().listOpenings(p.id, 10),
    getCollectionOverview(p.id),
    getPlayableSets(),
  ]);
  const done = new Map(unlocked.map((a) => [a.id, a.unlockedAt]));
  const setNames = new Map(sets.map((s) => [s.id, s.name]));
  const unique = overview.reduce((n, o) => n + o.owned, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <span className="w-16 h-16 rounded-3xl bg-brand grid place-items-center font-display font-bold text-3xl text-ink">
          {p.username[0]?.toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl truncate">{p.username}</h1>
          <p className="text-xs text-muted">Dresseur depuis le {new Date(p.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <form action={logoutAction}>
          <button className="press rounded-full bg-surface-2 px-4 py-2 text-xs font-bold">Déconnexion</button>
        </form>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ["Boosters ouverts", stats.openings],
          ["Cartes uniques", unique],
          ["Échanges", stats.tradesDone],
          ["Pièces", formatCoins(p.id, p.coins)],
        ].map(([label, v]) => (
          <div key={label} className="glass rounded-2xl p-3 text-center">
            <p className="font-display font-bold text-2xl">{typeof v === "number" ? v.toLocaleString("fr-FR") : v}</p>
            <p className="text-[11px] text-muted font-bold">{label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">
          Succès <span className="text-muted text-sm">{done.size}/{ACHIEVEMENTS.length}</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const at = done.get(a.id);
            return (
              <div
                key={a.id}
                className={`glass rounded-2xl p-3 flex gap-3 items-center ${at ? "border-volt/50" : "opacity-45 grayscale"}`}
              >
                <span className="text-3xl">{a.icon}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight">{a.title}</p>
                  <p className="text-[11px] text-muted leading-tight mt-0.5">{a.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-display font-bold text-xl mb-3">Derniers boosters</h2>
        {openings.length === 0 && <p className="text-sm text-muted">Aucun booster ouvert pour l&apos;instant.</p>}
        <ul className="space-y-2">
          {openings.map((o) => {
            const best = o.cards[o.cards.length - 1];
            return (
              <li key={o.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <Link href={`/carte/${best.cardId}`} className="press w-11 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cardImage(best.image, "low")} alt="" className="rounded-[4px] w-full" loading="lazy" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{setNames.get(o.setId) ?? o.setId}</p>
                  <p className="text-xs font-bold truncate" style={{ color: TIER_COLOR[best.tier] }}>
                    {best.name} · {best.rarity}
                  </p>
                  <p className="text-[11px] text-muted">
                    {new Date(o.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    {o.source === "bonus" && " · bonus"}
                  </p>
                </div>
                <span className="text-sm font-black flex items-center gap-1">
                  <Coin /> {o.value}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
