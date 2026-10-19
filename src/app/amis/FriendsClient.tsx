"use client";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeFriendAction, respondFriendAction, sendFriendRequestAction } from "@/app/actions";
import type { FriendView } from "@/lib/game/service";
import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toasts";

interface SearchResult {
  userId: string;
  username: string;
  avatar: string | null;
  relation: "none" | "friend" | "incoming" | "outgoing";
}

const btn = "press rounded-2xl min-h-11 px-4 font-bold text-sm disabled:opacity-50";

export function FriendsClient({ q, friends, results }: { q: string; friends: FriendView[]; results: SearchResult[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast({ icon: "⚠️", title: res.error ?? "Erreur", tone: "error" });
      toast({ icon: "🤝", title: success, tone: "success" });
      router.refresh();
    });

  const add = (id: string) =>
    start(async () => {
      const res = await sendFriendRequestAction(id);
      if (!res.ok) return toast({ icon: "⚠️", title: res.error, tone: "error" });
      toast({
        icon: "🤝",
        title: res.data === "accepted" ? "Vous êtes maintenant amis !" : "Demande d'ami envoyée",
        tone: "success",
      });
      router.refresh();
    });

  const incoming = friends.filter((f) => f.status === "pending" && f.direction === "incoming");
  const outgoing = friends.filter((f) => f.status === "pending" && f.direction === "outgoing");
  const accepted = friends.filter((f) => f.status === "accepted");

  return (
    <div className="space-y-8">
      {/* Recherche */}
      <section aria-labelledby="search-title" className="glass rounded-3xl p-4 space-y-3">
        <h2 id="search-title" className="font-display font-bold text-xl">
          Ajouter un ami
        </h2>
        <form className="flex gap-2" role="search">
          <label className="flex-1">
            <span className="sr-only">Pseudo du dresseur</span>
            <input
              name="q"
              defaultValue={q}
              minLength={2}
              placeholder="Pseudo du dresseur…"
              className="w-full rounded-2xl bg-surface-2 border border-line px-4 min-h-12 font-semibold"
            />
          </label>
          <button className={`${btn} bg-brand`}>Rechercher</button>
        </form>
        {q && (
          <ul className="space-y-2" aria-live="polite">
            {results.length === 0 && <li className="text-sm text-muted">Aucun dresseur trouvé pour « {q} ».</li>}
            {results.map((r) => (
              <li key={r.userId} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2 pl-3">
                <Avatar name={r.username} src={r.avatar} />
                <Link href={`/joueur/${r.userId}`} className="flex-1 font-bold truncate hover:underline">
                  {r.username}
                </Link>
                {r.relation === "none" && (
                  <button disabled={pending} onClick={() => add(r.userId)} className={`${btn} bg-brand`}>
                    Ajouter
                  </button>
                )}
                {r.relation === "incoming" && (
                  <button disabled={pending} onClick={() => add(r.userId)} className={`${btn} bg-brand`}>
                    Accepter
                  </button>
                )}
                {r.relation === "outgoing" && <span className="text-sm text-muted font-bold px-2">Demande envoyée</span>}
                {r.relation === "friend" && <span className="text-sm text-good font-bold px-2">Ami ✓</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Demandes reçues */}
      {incoming.length > 0 && (
        <section aria-labelledby="incoming-title">
          <h2 id="incoming-title" className="font-display font-bold text-xl mb-2">
            Demandes reçues <span className="text-muted text-base">({incoming.length})</span>
          </h2>
          <ul className="space-y-2">
            {incoming.map((f) => (
              <li key={f.userId} className="glass rounded-2xl p-3 flex items-center gap-3 flex-wrap">
                <Avatar name={f.username} src={f.avatar} />
                <Link href={`/joueur/${f.userId}`} className="flex-1 font-bold truncate hover:underline">
                  {f.username}
                </Link>
                <div className="flex gap-2">
                  <button
                    disabled={pending}
                    onClick={() => act(() => respondFriendAction(f.userId, false), "Demande refusée")}
                    className={`${btn} bg-surface-2`}
                  >
                    Refuser
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => act(() => respondFriendAction(f.userId, true), `${f.username} est ton ami !`)}
                    className={`${btn} bg-brand`}
                  >
                    Accepter
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Amis */}
      <section aria-labelledby="friends-title">
        <h2 id="friends-title" className="font-display font-bold text-xl mb-2">
          Mes amis <span className="text-muted text-base">({accepted.length})</span>
        </h2>
        {accepted.length === 0 ? (
          <p className="glass rounded-3xl p-6 text-center text-muted">
            Pas encore d&apos;amis. Recherche un pseudo ci-dessus pour envoyer une demande.
          </p>
        ) : (
          <ul className="space-y-2">
            {accepted.map((f) => (
              <li key={f.userId} className="glass rounded-2xl p-3 flex items-center gap-3 flex-wrap">
                <Avatar name={f.username} src={f.avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <Link href={`/joueur/${f.userId}`} className="font-bold truncate hover:underline block">
                    {f.username}
                  </Link>
                  <p className="text-sm text-muted">{f.unique.toLocaleString("fr-FR")} cartes différentes</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/echanges/nouveau?joueur=${f.userId}`} className={`${btn} bg-brand grid place-items-center`}>
                    Échanger
                  </Link>
                  <button
                    disabled={pending}
                    onClick={() => act(() => removeFriendAction(f.userId), `${f.username} retiré de tes amis`)}
                    className={`${btn} bg-surface-2`}
                    aria-label={`Retirer ${f.username} de mes amis`}
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Demandes envoyées */}
      {outgoing.length > 0 && (
        <section aria-labelledby="outgoing-title">
          <h2 id="outgoing-title" className="font-display font-bold text-xl mb-2">
            Demandes envoyées
          </h2>
          <ul className="space-y-2">
            {outgoing.map((f) => (
              <li key={f.userId} className="glass rounded-2xl p-3 flex items-center gap-3">
                <Avatar name={f.username} src={f.avatar} />
                <span className="flex-1 font-bold truncate">{f.username}</span>
                <button
                  disabled={pending}
                  onClick={() => act(() => removeFriendAction(f.userId), "Demande annulée")}
                  className={`${btn} bg-surface-2`}
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
