import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Logo } from "./Logo";
import { Coin } from "./Coin";
import { formatCoins, hasUnlimitedCoins } from "@/lib/game/demo";

export async function AppHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="press flex items-center gap-2 lg:invisible">
          <Logo className="w-9 h-9" />
          <span className="font-display font-bold text-xl">Holofoil</span>
        </Link>

        {profile ? (
          <div className="flex items-center gap-2">
            <Link
              href="/boutique"
              className="press flex items-center gap-2 rounded-full bg-surface-2 border border-line px-4 min-h-11 font-bold"
            >
              <Coin className="w-5 h-5" />
              <span>{formatCoins(profile.id, profile.coins)}</span>
              <span className="sr-only">
                {hasUnlimitedCoins(profile.id) ? "pièces illimitées" : "pièces"} — aller à la boutique
              </span>
            </Link>
            <Link
              href="/profil"
              className="press lg:hidden w-11 h-11 rounded-full bg-cyan text-white grid place-items-center font-display font-bold text-lg overflow-hidden"
              aria-label={`Mon profil (${profile.username})`}
            >
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.username.slice(0, 1).toUpperCase()
              )}
            </Link>
          </div>
        ) : (
          <Link href="/connexion" className="press rounded-full bg-brand px-5 min-h-11 grid place-items-center font-bold">
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
