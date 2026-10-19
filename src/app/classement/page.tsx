import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/game/service";

export const metadata = { title: "Classement" };
export const dynamic = "force-dynamic";

const TABS = {
  uniques: { label: "Cartes uniques", key: "unique" as const },
  sets: { label: "Sets complets", key: "setsCompleted" as const },
  total: { label: "Total cartes", key: "total" as const },
};
type TabKey = keyof typeof TABS;

export default async function LeaderboardPage({ searchParams }: PageProps<"/classement">) {
  const sp = await searchParams;
  const tab: TabKey = typeof sp.tri === "string" && sp.tri in TABS ? (sp.tri as TabKey) : "uniques";
  const key = TABS[tab].key;
  const [me, all] = await Promise.all([getCurrentProfile(), getLeaderboard()]);
  const ranked = all.sort((a, b) => b[key] - a[key] || b.unique - a.unique).slice(0, 100);
  const myRank = me ? ranked.findIndex((r) => r.userId === me.id) : -1;

  return (
    <div className="space-y-5">
      <h1 className="font-display font-bold text-3xl">Classement</h1>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(Object.keys(TABS) as TabKey[]).map((t) => (
          <Link
            key={t}
            href={`/classement?tri=${t}`}
            className={`press shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              t === tab ? "bg-text text-surface" : "bg-surface-2 text-muted"
            }`}
          >
            {TABS[t].label}
          </Link>
        ))}
      </div>

      {ranked.length >= 3 && <Podium top={ranked.slice(0, 3)} k={key} />}

      <ol className="space-y-2">
        {ranked.map((r, i) => (
          <li
            key={r.userId}
            className={`glass rounded-2xl px-4 py-3 flex items-center gap-3 ${r.userId === me?.id ? "border-pink/70" : ""}`}
          >
            <span className="w-8 font-display font-bold text-lg text-muted tabular-nums">{i + 1}</span>
            <span className="w-9 h-9 rounded-full bg-brand grid place-items-center font-black text-ink shrink-0">
              {r.username[0]?.toUpperCase()}
            </span>
            <span className="flex-1 font-bold truncate">
              {r.userId === me?.id ? (
                r.username
              ) : (
                <Link href={`/joueur/${r.userId}`} className="hover:underline">
                  {r.username}
                </Link>
              )}
              {r.userId === me?.id && <span className="text-pink text-xs ml-2">toi</span>}
            </span>
            <span className="font-display font-bold tabular-nums">{r[key].toLocaleString("fr-FR")}</span>
          </li>
        ))}
        {ranked.length === 0 && <p className="text-muted text-sm">Personne n&apos;a encore ouvert de booster.</p>}
      </ol>
      {me && myRank === -1 && <p className="text-sm text-muted">Ouvre ton premier booster pour entrer au classement !</p>}
    </div>
  );
}

function Podium({ top, k }: { top: LeaderboardEntry[]; k: "unique" | "setsCompleted" | "total" }) {
  const order = [top[1], top[0], top[2]];
  const heights = ["h-20", "h-28", "h-16"];
  const medals = ["🥈", "🥇", "🥉"];
  return (
    <div className="grid grid-cols-3 items-end gap-2 pt-4">
      {order.map((r, i) => (
        <div key={r.userId} className="text-center">
          <p className="text-3xl">{medals[i]}</p>
          <p className="font-bold text-sm truncate">{r.username}</p>
          <p className="text-xs text-muted font-bold">{r[k].toLocaleString("fr-FR")}</p>
          <div className={`mt-2 rounded-t-2xl bg-brand opacity-80 ${heights[i]}`} />
        </div>
      ))}
    </div>
  );
}
