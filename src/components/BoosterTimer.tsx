"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TimerState } from "@/lib/game/timer";

const INTERVAL = 10 * 60_000;

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Calcule l'état courant à partir de l'état serveur (horloge recalée sur le serveur) */
function useLiveTimer(initial: TimerState) {
  const router = useRouter();
  const [now, setNow] = useState(initial.serverNow);

  useEffect(() => {
    const offset = initial.serverNow - Date.now();
    const id = setInterval(() => setNow(Date.now() + offset), 250);
    return () => clearInterval(id);
  }, [initial.serverNow]);

  let available = initial.available;
  let nextAt = initial.nextAt;
  while (nextAt !== null && now >= nextAt && available < initial.max) {
    available++;
    nextAt = available >= initial.max ? null : nextAt + INTERVAL;
  }

  useEffect(() => {
    if (available > initial.available) router.refresh();
  }, [available, initial.available, router]);

  const remaining = nextAt ? nextAt - now : 0;
  return { available, nextAt, remaining, progress: nextAt ? 1 - remaining / INTERVAL : 1 };
}

/** Jauge circulaire de la réserve de boosters gratuits */
export function BoosterTimer({ initial, compact = false }: { initial: TimerState; compact?: boolean }) {
  const { available, nextAt, remaining, progress } = useLiveTimer(initial);
  const minutes = Math.ceil(remaining / 60_000);
  const announce = nextAt
    ? `${available} booster${available > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""}. Prochain dans ${minutes} minute${minutes > 1 ? "s" : ""}.`
    : `Réserve pleine : ${available} boosters disponibles.`;

  if (compact) {
    return (
      <p className="font-display font-bold text-3xl tabular-nums">
        <span className="sr-only">Prochain booster dans </span>
        {nextAt ? fmt(remaining) : "Réserve pleine !"}
      </p>
    );
  }

  const R = 70;
  const C = 2 * Math.PI * R;

  return (
    <section aria-labelledby="reserve-title" className="glass rounded-[28px] p-5">
      <h2 id="reserve-title" className="font-display font-bold text-xl">
        Ta réserve
      </h2>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <div className="mt-3 flex items-center gap-5">
        <div className="relative w-40 h-40 shrink-0" aria-hidden>
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="14" />
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="var(--pink)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.3s linear" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display font-bold text-5xl leading-none">{available}</p>
              <p className="text-sm font-bold text-muted">sur {initial.max}</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">{nextAt ? "Prochain booster dans" : "Réserve"}</p>
          <p className="font-display font-bold text-3xl tabular-nums">{nextAt ? fmt(remaining) : "Pleine !"}</p>
          {initial.bonus > 0 && (
            <p className="mt-2 inline-block rounded-full bg-volt text-ink px-3 py-1 text-sm font-bold">
              + {initial.bonus} bonus
            </p>
          )}
        </div>
      </div>

      {/* Pastilles de stock, lisibles sans couleur grâce au remplissage */}
      <ol className="mt-4 flex gap-1.5" aria-hidden>
        {Array.from({ length: initial.max }, (_, i) => (
          <li
            key={i}
            className={`h-3 flex-1 rounded-full border-2 ${i < available ? "bg-pink border-pink" : "border-line"}`}
          />
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        1 booster gratuit toutes les 10 minutes, jusqu&apos;à {initial.max} en réserve.
      </p>
    </section>
  );
}
