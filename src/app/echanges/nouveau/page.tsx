import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { getFriendsView, hydrateCards } from "@/lib/game/service";
import { Avatar } from "@/components/Avatar";
import { tierOf, tierRank } from "@/lib/booster/rarity";
import { TradeBuilder, type PickCard } from "./TradeBuilder";

export const metadata = { title: "Nouvel échange" };
export const dynamic = "force-dynamic";

export default async function NewTradePage({ searchParams }: PageProps<"/echanges/nouveau">) {
  const me = await requireProfile();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const wantedCard = typeof sp.carte === "string" ? sp.carte : null;
  // Id venu de l'URL : format strict avant toute requête
  const partnerId = typeof sp.joueur === "string" && /^[A-Za-z0-9-]{1,64}$/.test(sp.joueur) ? sp.joueur : null;

  // Étape 2 : un partenaire est choisi → on construit l'échange
  if (partnerId) {
    const [partner] = await store().getProfiles([partnerId]);
    if (!partner || partner.id === me.id) return <p className="text-muted">Joueur introuvable.</p>;
    const [mine, theirs] = await Promise.all([store().getUserCards(me.id), store().getUserCards(partner.id)]);
    const meta = await hydrateCards([...mine, ...theirs].map((c) => c.cardId));
    const mineIds = new Set(mine.map((c) => c.cardId));
    const toPick = (list: typeof mine, flagMissing: boolean): PickCard[] =>
      list
        .map((c) => {
          const m = meta.get(c.cardId);
          if (!m) return null;
          return {
            id: c.cardId,
            name: m.name,
            image: m.image,
            rarity: m.rarity,
            quantity: c.quantity,
            missing: flagMissing && !mineIds.has(c.cardId),
          };
        })
        .filter((c): c is PickCard => c !== null)
        .sort(
          (a, b) =>
            Number(b.missing) - Number(a.missing) ||
            b.quantity - a.quantity ||
            tierRank(tierOf(b.rarity)) - tierRank(tierOf(a.rarity)),
        );

    return (
      <div className="space-y-4">
        <Link href="/echanges/nouveau" className="press inline-flex text-sm font-bold text-muted">
          ← Choisir un autre joueur
        </Link>
        <h1 className="font-display font-bold text-2xl">
          Échange avec <span className="text-brand">{partner.username}</span>
        </h1>
        <TradeBuilder
          partnerId={partner.id}
          mine={toPick(mine, false)}
          theirs={toPick(theirs, true)}
          initialWanted={wantedCard}
        />
      </div>
    );
  }

  // Étape 1 : choisir un joueur (recherche, ou propriétaires d'une carte précise)
  const owners = wantedCard ? (await store().cardOwners(wantedCard)).filter((o) => o.userId !== me.id) : [];
  const ownerProfiles = await store().getProfiles(owners.map((o) => o.userId));
  const results = q ? (await store().searchProfiles(q, 15)).filter((p) => p.id !== me.id) : [];
  const wantedMeta = wantedCard ? (await hydrateCards([wantedCard])).get(wantedCard) : undefined;
  const friends = (await getFriendsView(me.id)).filter((f) => f.status === "accepted");
  const link = (id: string) => `/echanges/nouveau?joueur=${id}${wantedCard ? `&carte=${encodeURIComponent(wantedCard)}` : ""}`;

  return (
    <div className="space-y-5">
      <Link href="/echanges" className="press inline-flex text-sm font-bold text-muted">
        ← Échanges
      </Link>
      <h1 className="font-display font-bold text-2xl">Nouvel échange</h1>

      {wantedCard && (
        <section className="glass rounded-3xl p-4">
          <p className="text-sm font-bold">
            Joueurs qui possèdent <span className="text-pink">{wantedMeta?.name ?? wantedCard}</span>
          </p>
          {ownerProfiles.length === 0 ? (
            <p className="text-sm text-muted mt-2">Personne ne l&apos;a encore… Continue d&apos;ouvrir des boosters !</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ownerProfiles.map((p) => (
                <li key={p.id}>
                  <Link href={link(p.id)} className="press flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
                    <span className="font-bold">{p.username}</span>
                    <span className="text-xs text-muted">×{owners.find((o) => o.userId === p.id)?.quantity}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {friends.length > 0 && (
        <section aria-labelledby="friends-title">
          <h2 id="friends-title" className="font-display font-bold text-lg mb-2">
            Mes amis
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {friends.map((f) => (
              <li key={f.userId}>
                <Link href={link(f.userId)} className="press flex items-center gap-3 glass rounded-2xl px-4 min-h-14">
                  <Avatar name={f.username} src={f.avatar} size={36} />
                  <span className="font-bold flex-1 truncate">{f.username}</span>
                  <span className="text-sm text-muted">{f.unique} cartes</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form className="flex gap-2">
        {wantedCard && <input type="hidden" name="carte" value={wantedCard} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un dresseur…"
          className="flex-1 rounded-2xl bg-surface-2 border border-line px-4 py-3 font-bold outline-none focus:border-pink"
        />
        <button className="press rounded-2xl bg-brand px-4 font-black text-ink">OK</button>
      </form>

      {q && (
        <ul className="space-y-2">
          {results.length === 0 && <p className="text-sm text-muted">Aucun joueur trouvé.</p>}
          {results.map((p) => (
            <li key={p.id}>
              <Link href={link(p.id)} className="press flex items-center gap-3 glass rounded-2xl px-4 py-3">
                <span className="w-9 h-9 rounded-full bg-brand grid place-items-center font-black text-ink">
                  {p.username[0]?.toUpperCase()}
                </span>
                <span className="font-bold">{p.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
