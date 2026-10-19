"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "./Logo";
import { IconBinder, IconFriends, IconPack, IconShop, IconTrade, IconTrophy, IconUser } from "./Icons";

/** Pastille de compteur (texte lu par les lecteurs d'écran) */
function Count({ n, label, className = "" }: { n: number; label: string; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={`rounded-full bg-volt text-ink text-xs font-black min-w-6 h-6 px-1.5 grid place-items-center ${className}`}>
      {n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

const ITEMS = [
  { href: "/", label: "Boosters", Icon: IconPack, match: (p: string) => p === "/" || p.startsWith("/ouvrir") },
  { href: "/collection", label: "Classeur", Icon: IconBinder, match: (p: string) => p.startsWith("/collection") || p.startsWith("/carte") },
  { href: "/boutique", label: "Boutique", Icon: IconShop, match: (p: string) => p.startsWith("/boutique") },
  { href: "/echanges", label: "Échanges", Icon: IconTrade, match: (p: string) => p.startsWith("/echanges") },
  { href: "/amis", label: "Amis", Icon: IconFriends, match: (p: string) => p.startsWith("/amis") || p.startsWith("/joueur") },
  { href: "/classement", label: "Classement", Icon: IconTrophy, match: (p: string) => p.startsWith("/classement") },
  { href: "/profil", label: "Profil", Icon: IconUser, match: (p: string) => p.startsWith("/profil") },
];

/** Barre latérale (ordinateur) : façon panneau de Pokédex */
export function SideNav({ boosters, friendRequests }: { boosters: number; friendRequests: number }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-nav text-nav-ink"
    >
      <Link href="/" className="flex items-center gap-3 px-6 h-20 shrink-0">
        <Logo className="w-11 h-11" />
        <span className="font-display font-bold text-2xl">Holofoil</span>
      </Link>
      {/* Voyants décoratifs */}
      <div aria-hidden className="flex gap-2 px-6 pb-4">
        <span className="w-3 h-3 rounded-full bg-[#7fd4ff] ring-2 ring-white/40" />
        <span className="w-3 h-3 rounded-full bg-volt ring-2 ring-white/40" />
        <span className="w-3 h-3 rounded-full bg-[#5ee38a] ring-2 ring-white/40" />
      </div>
      <ul className="flex-1 px-3 space-y-1">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`press flex items-center gap-3 rounded-2xl px-4 min-h-12 font-bold text-[17px] ${
                  active ? "bg-white text-[#16213e]" : "hover:bg-white/10"
                }`}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className="flex-1">{label}</span>
                {href === "/" && <Count n={boosters} label="boosters disponibles" />}
                {href === "/amis" && <Count n={friendRequests} label="demandes d'ami" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barre du bas (mobile) : libellés visibles + gros bouton central pour ouvrir */
export function MobileNav({ boosters, friendRequests }: { boosters: number; friendRequests: number }) {
  const path = usePathname();
  if (path.startsWith("/ouvrir")) return null; // plein écran pendant l'ouverture
  const [, binder, shop, trade, friends] = ITEMS;
  const left = [binder, shop];
  const right = [trade, friends];
  const homeActive = ITEMS[0].match(path);

  const item = ({ href, label, Icon, match }: (typeof ITEMS)[number]) => {
    const active = match(path);
    return (
      <li key={href} className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`press flex flex-col items-center justify-center gap-0.5 min-h-14 text-xs font-bold ${
            active ? "text-pink" : "text-muted"
          }`}
        >
          <span className="relative">
            <Icon className="w-6 h-6" />
            {href === "/amis" && <Count n={friendRequests} label="demandes d'ami" className="absolute -top-2 -right-3" />}
          </span>
          {label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Navigation principale" className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom">
      <ul className="relative mx-auto max-w-lg flex items-end bg-surface border-t border-line shadow-[0_-6px_20px_-10px_rgb(16_24_40/0.25)] px-1">
        {left.map(item)}
        <li className="flex-1 flex justify-center">
          <Link
            href="/"
            aria-current={homeActive ? "page" : undefined}
            className="press relative -mt-7 mb-1 flex flex-col items-center gap-0.5 text-xs font-bold text-text"
          >
            <motion.span
              className="w-16 h-16 rounded-full bg-poke text-white grid place-items-center border-4 border-surface shadow-lg"
              animate={boosters > 0 ? { scale: [1, 1.06, 1] } : undefined}
              transition={{ duration: 1.8, repeat: Infinity }}
            >
              <IconPack className="w-8 h-8" />
            </motion.span>
            Ouvrir
            {boosters > 0 && (
              <span className="absolute top-0 right-0 rounded-full bg-volt text-ink text-xs font-black min-w-6 h-6 px-1.5 grid place-items-center border-2 border-surface">
                {boosters}
                <span className="sr-only"> boosters disponibles</span>
              </span>
            )}
          </Link>
        </li>
        {right.map(item)}
      </ul>
    </nav>
  );
}
