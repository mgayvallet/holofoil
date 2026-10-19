import { requireProfile } from "@/lib/auth";
import { getFriendsView } from "@/lib/game/service";
import { store } from "@/lib/store";
import { FriendsClient } from "./FriendsClient";

export const metadata = { title: "Amis" };
export const dynamic = "force-dynamic";

export default async function FriendsPage({ searchParams }: PageProps<"/amis">) {
  const me = await requireProfile();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 30) : "";
  const [friends, results] = await Promise.all([
    getFriendsView(me.id),
    q.length >= 2 ? store().searchProfiles(q, 15) : Promise.resolve([]),
  ]);
  const relation = new Map(friends.map((f) => [f.userId, f]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl">Amis</h1>
        <p className="text-muted">Ajoute des dresseurs pour voir leurs classeurs et échanger plus vite.</p>
      </div>
      <FriendsClient
        q={q}
        friends={friends}
        results={results
          .filter((p) => p.id !== me.id)
          .map((p) => ({
            userId: p.id,
            username: p.username,
            avatar: p.avatar,
            relation: relation.get(p.id)
              ? relation.get(p.id)!.status === "accepted"
                ? "friend"
                : relation.get(p.id)!.direction
              : "none",
          }))}
      />
    </div>
  );
}
