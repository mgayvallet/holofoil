import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { getCategories } from "@/lib/game/categories";
import { getCollectionOverview } from "@/lib/game/service";
import { timerState } from "@/lib/game/timer";
import { BoosterTimer } from "@/components/BoosterTimer";
import { BoosterRow } from "@/components/BoosterRow";
import { Logo } from "@/components/Logo";
import { IconBinder, IconTrophy } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile) return <Landing />;

  const [categories, overview] = await Promise.all([getCategories(), getCollectionOverview(profile.id)]);
  const progress = new Map(overview.map((o) => [o.setId, o]));
  const timer = timerState(profile.boosterAnchor, profile.bonusBoosters);
  const canOpen = timer.available + timer.bonus > 0;
  const unique = overview.reduce((n, o) => n + o.owned, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-3xl">Bonjour {profile.username} !</h1>
        <p className="text-muted">
          {canOpen ? "Tes boosters t'attendent : un booster par génération, du Set de Base à aujourd'hui." : "Ta réserve se recharge. Patience, dresseur !"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] items-start">
        <div className="space-y-4 lg:sticky lg:top-24">
          <BoosterTimer initial={timer} />
          <div className="grid grid-cols-2 gap-3">
            <Link href="/collection" className="press glass rounded-3xl p-4 flex flex-col gap-1">
              <IconBinder className="w-7 h-7 text-cyan" />
              <span className="font-bold">Mon classeur</span>
              <span className="text-sm text-muted">{unique} cartes</span>
            </Link>
            <Link href="/classement" className="press glass rounded-3xl p-4 flex flex-col gap-1">
              <IconTrophy className="w-7 h-7 text-pink" />
              <span className="font-bold">Classement</span>
              <span className="text-sm text-muted">Top dresseurs</span>
            </Link>
          </div>
        </div>

        <section aria-labelledby="boosters-title">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 id="boosters-title" className="font-display font-bold text-2xl">
              Choisis ton booster
            </h2>
            <p className="text-sm text-muted font-bold">{categories.length} boosters · toutes les générations</p>
          </div>
          <ul className="space-y-3">
            {categories.map((c, i) => (
              <BoosterRow
                key={c.id}
                featured={i === 0}
                canOpen={canOpen}
                b={{
                  id: c.id,
                  name: c.name,
                  logo: c.logo,
                  years: c.years,
                  setCount: c.sets.length,
                  packSize: c.packSize,
                  owned: c.sets.reduce((n, s) => n + (progress.get(s.id)?.owned ?? 0), 0),
                  total: c.sets.reduce((n, s) => n + (progress.get(s.id)?.total ?? s.total), 0),
                }}
              />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Landing() {
  const steps = [
    ["1", "Ouvre un booster", "Un gratuit toutes les 10 minutes, avec les vraies cartes et raretés."],
    ["2", "Complète tes sets", "Range tes cartes dans ton classeur, set par set."],
    ["3", "Échange", "Propose tes doublons aux autres dresseurs."],
  ];
  return (
    <div className="py-8 sm:py-14 grid gap-10 lg:grid-cols-2 items-center">
      <div className="space-y-5">
        <Logo className="w-20 h-20" />
        <h1 className="font-display font-bold text-4xl sm:text-5xl leading-[1.1]">
          Ta collection de cartes Pokémon, <span className="text-brand">un booster à la fois.</span>
        </h1>
        <p className="text-lg text-muted max-w-md">
          Gratuit, sans argent réel. Déchire tes boosters, découvre tes cartes et complète les sets du JCC.
        </p>
        <Link
          href="/connexion"
          className="press inline-grid place-items-center rounded-2xl bg-brand px-8 min-h-14 font-display font-bold text-xl"
        >
          Commencer à jouer
        </Link>
      </div>
      <ol className="space-y-3">
        {steps.map(([n, t, d]) => (
          <li key={n} className="glass rounded-3xl p-5 flex gap-4 items-start">
            <span className="w-10 h-10 shrink-0 rounded-full bg-poke text-white grid place-items-center font-display font-bold text-lg">
              {n}
            </span>
            <div>
              <p className="font-display font-bold text-lg">{t}</p>
              <p className="text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
