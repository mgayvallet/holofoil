import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60dvh] grid place-items-center text-center">
      <div>
        <p className="font-display font-bold text-6xl text-brand">404</p>
        <p className="font-bold mt-2">Cette page s&apos;est enfuie comme un Pokémon sauvage.</p>
        <p className="text-sm text-muted">(Ou ce set n&apos;est pas proposé aujourd&apos;hui.)</p>
        <Link href="/" className="press inline-block mt-5 rounded-full bg-brand px-6 py-3 font-black text-ink">
          Retour aux boosters
        </Link>
      </div>
    </div>
  );
}
