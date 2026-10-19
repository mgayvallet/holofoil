import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { getCategories } from "@/lib/game/categories";
import { getCollectionOverview } from "@/lib/game/service";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { Avatar } from "@/components/Avatar";
import { FriendButton } from "./FriendButton";

export const dynamic = "force-dynamic";

async function load(raw: string) {
  const id = decodeURIComponent(raw);
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return null; // id venu de l'URL : format strict
  const [p] = await store().getProfiles([id]);
  return p ?? null;
}

export async function generateMetadata({ params }: PageProps<"/joueur/[userId]">) {
  const p = await load((await params).userId);
  return { title: p ? `Profil de ${p.username}` : "Joueur" };
}

export default async function PlayerPage({ params }: PageProps<"/joueur/[userId]">) {
  const me = await requireProfile();
  const player = await load((await params).userId);
  if (!player) notFound();
  if (player.id === me.id) redirect("/profil");

  const [stats, achievements, overview, categories, links] = await Promise.all([
    store().getStats(player.id),
    store().getAchievements(player.id),
    getCollectionOverview(player.id),
    getCategories(),
    store().listFriendships(me.id),
  ]);
  const link = links.find((l) => l.userId === player.id);
  const relation = !link ? "none" : link.status === "accepted" ? "friend" : link.direction;
  const progress = new Map(overview.map((o) => [o.setId, o]));
  const unique = overview.reduce((n, o) => n + o.owned, 0);
  const done = new Set(achievements.map((a) => a.id));

  return (
    <div className="space-y-6">
      <Link href="/amis" className="press inline-flex text-sm font-bold text-muted">
        ← Amis
      </Link>

      <header className="glass rounded-3xl p-5 flex items-center gap-4 flex-wrap">
        <Avatar name={player.username} src={player.avatar} size={64} />
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl truncate">{player.username}</h1>
          <p className="text-sm text-muted">Dresseur depuis le {new Date(player.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FriendButton userId={player.id} relation={relation} />
          <Link
            href={`/echanges/nouveau?joueur=${player.id}`}
            className="press rounded-2xl bg-surface-2 min-h-11 px-4 font-bold text-sm grid place-items-center"
          >
            Proposer un échange
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2" aria-label="Statistiques">
        {[
          ["Cartes uniques", unique],
          ["Boosters ouverts", stats.openings],
          ["Succès", done.size],
        ].map(([label, v]) => (
          <div key={label} className="glass rounded-2xl p-3 text-center">
            <p className="font-display font-bold text-2xl">{Number(v).toLocaleString("fr-FR")}</p>
            <p className="text-xs text-muted font-bold">{label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="col-title">
        <h2 id="col-title" className="font-display font-bold text-xl mb-2">
          Collection par génération
        </h2>
        <ul className="space-y-2">
          {categories.map((c) => {
            const owned = c.sets.reduce((n, s) => n + (progress.get(s.id)?.owned ?? 0), 0);
            const total = c.sets.reduce((n, s) => n + (progress.get(s.id)?.total ?? s.total), 0);
            const pct = total ? Math.floor((owned / total) * 100) : 0;
            return (
              <li key={c.id} className="glass rounded-2xl px-4 py-3">
                <div className="flex justify-between gap-2 text-sm font-bold">
                  <span>{c.name}</span>
                  <span className="tabular-nums">
                    {owned.toLocaleString("fr-FR")}/{total.toLocaleString("fr-FR")}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 rounded-full bg-surface-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={c.name}
                >
                  <div className="h-full bg-cyan" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ach-title">
        <h2 id="ach-title" className="font-display font-bold text-xl mb-2">
          Succès
        </h2>
        <ul className="flex flex-wrap gap-2">
          {ACHIEVEMENTS.filter((a) => done.has(a.id)).map((a) => (
            <li key={a.id} className="glass rounded-full px-3 py-1.5 text-sm font-bold">
              <span aria-hidden>{a.icon}</span> {a.title}
            </li>
          ))}
          {done.size === 0 && <li className="text-sm text-muted">Aucun succès pour l&apos;instant.</li>}
        </ul>
      </section>
    </div>
  );
}
