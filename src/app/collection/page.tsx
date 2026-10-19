import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { getCategories } from "@/lib/game/categories";
import { getCollectionOverview, hydrateCards } from "@/lib/game/service";
import { tierOf, tierRank } from "@/lib/booster/rarity";
import { CollectionClient, type CollectionCard, type CollectionCategory } from "./CollectionClient";

export const metadata = { title: "Mon classeur" };
export const dynamic = "force-dynamic";

export default async function CollectionPage({ searchParams }: PageProps<"/collection">) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const [categories, overview, owned] = await Promise.all([
    getCategories(),
    getCollectionOverview(profile.id),
    store().getUserCards(profile.id),
  ]);
  const progress = new Map(overview.map((o) => [o.setId, o]));
  const meta = await hydrateCards(owned.map((c) => c.cardId));

  // Même découpage et mêmes noms que les boosters
  const categoryOfSet = new Map<string, string>();
  const setInfo = new Map<string, { name: string; releaseDate?: string }>();
  for (const c of categories) {
    for (const s of c.sets) {
      categoryOfSet.set(s.id, c.id);
      setInfo.set(s.id, { name: s.name, releaseDate: s.releaseDate });
    }
  }

  const cards: CollectionCard[] = owned
    .map((o) => {
      const m = meta.get(o.cardId);
      if (!m) return null;
      return {
        id: o.cardId,
        name: m.name,
        image: m.image,
        rarity: m.rarity,
        rank: tierRank(tierOf(m.rarity)),
        quantity: o.quantity,
        setId: o.setId,
        setName: setInfo.get(o.setId)?.name ?? o.setId,
        categoryId: categoryOfSet.get(o.setId) ?? "special",
        release: setInfo.get(o.setId)?.releaseDate ?? "",
        localId: m.localId,
      };
    })
    .filter((c): c is CollectionCard => c !== null)
    // De la plus rare à la moins rare ; à rareté égale, le set le plus récent puis le numéro
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        b.release.localeCompare(a.release) ||
        a.localId.localeCompare(b.localId, "fr", { numeric: true }),
    );

  const cats: CollectionCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    years: c.years,
    owned: c.sets.reduce((n, s) => n + (progress.get(s.id)?.owned ?? 0), 0),
    total: c.sets.reduce((n, s) => n + (progress.get(s.id)?.total ?? s.total), 0),
    sets: c.sets.map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo,
      owned: progress.get(s.id)?.owned ?? 0,
      total: progress.get(s.id)?.total ?? s.total,
    })),
  }));

  const initial = typeof sp.categorie === "string" && cats.some((c) => c.id === sp.categorie) ? sp.categorie : "all";
  const completed = overview.filter((o) => o.total && o.owned >= o.total).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display font-bold text-3xl">Mon classeur</h1>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Cartes uniques" value={cards.length} />
          <Stat label="Sets entamés" value={overview.filter((o) => o.owned > 0).length} />
          <Stat label="Sets complets" value={completed} />
        </div>
      </header>
      <CollectionClient categories={cats} cards={cards} initialCategory={initial} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <p className="font-display font-bold text-2xl">{value.toLocaleString("fr-FR")}</p>
      <p className="text-xs text-muted font-bold">{label}</p>
    </div>
  );
}
