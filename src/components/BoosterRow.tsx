import Link from "next/link";
import { PackArt } from "./BoosterPack";

export interface BoosterRowData {
  id: string;
  name: string;
  logo?: string;
  years: string;
  setCount: number;
  packSize: number;
  owned: number;
  total: number;
}

/** Ligne de booster : vignette, nom, contenu, progression et action claire */
export function BoosterRow({ b, featured = false, canOpen }: { b: BoosterRowData; featured?: boolean; canOpen: boolean }) {
  const percent = b.total ? Math.floor((b.owned / b.total) * 100) : 0;
  return (
    <li>
      <Link
        href={`/ouvrir/${b.id}`}
        className="press group glass rounded-3xl p-3 pr-4 flex items-center gap-4 hover:border-cyan"
      >
        <div className="relative w-16 sm:w-20 aspect-[5/8.2] shrink-0 transition-transform group-hover:-rotate-3" aria-hidden>
          <PackArt setId={b.id} setName={b.name} logo={b.logo} serieName={b.years} packSize={b.packSize} mini />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-lg leading-tight">{b.name}</p>
            {featured && <span className="rounded-full bg-volt text-ink text-xs font-bold px-2 py-0.5">Nouveautés</span>}
          </div>
          <p className="text-sm text-muted">
            {b.years} · {b.setCount} set{b.setCount > 1 ? "s" : ""} · {b.packSize} cartes par booster
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-2.5 flex-1 rounded-full bg-surface-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Collection ${b.name}`}
            >
              <div className="h-full bg-cyan rounded-full" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-sm font-bold tabular-nums">
              {b.owned.toLocaleString("fr-FR")}/{b.total.toLocaleString("fr-FR")}
            </span>
          </div>
        </div>
        <span
          className={`hidden sm:grid place-items-center rounded-2xl px-4 min-h-11 font-bold ${
            canOpen ? "bg-brand" : "bg-surface-2 text-muted"
          }`}
        >
          Ouvrir
        </span>
      </Link>
    </li>
  );
}
