import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { timerState } from "@/lib/game/timer";
import { getCategory } from "@/lib/game/categories";
import { OpeningExperience } from "@/components/opening/OpeningExperience";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/ouvrir/[categoryId]">) {
  const c = await getCategory((await params).categoryId);
  return { title: c ? `Booster ${c.name}` : "Booster" };
}

export default async function OpenPage({ params }: PageProps<"/ouvrir/[categoryId]">) {
  const { categoryId } = await params;
  const profile = await requireProfile();
  const category = await getCategory(categoryId);
  if (!category) notFound();

  return (
    <div>
      <Link href="/" className="press inline-flex items-center gap-1 text-sm font-bold text-muted">
        ← Boosters
      </Link>
      <OpeningExperience
        booster={{
          id: category.id,
          name: category.name,
          logo: category.logo,
          serieName: `${category.years} · ${category.sets.length} sets`,
          packSize: category.packSize,
        }}
        timer={timerState(profile.boosterAnchor, profile.bonusBoosters)}
      />
    </div>
  );
}
