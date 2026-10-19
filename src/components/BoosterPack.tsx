"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { setAsset } from "@/lib/tcgdex/ids";
import PACK_ART from "@/lib/booster/pack-art.json";

/** Couleurs du booster dérivées de l'id du set : chaque set a sa propre enveloppe */
export function packColors(setId: string) {
  let h = 0;
  for (const ch of setId) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return { a: `hsl(${h} 85% 52%)`, b: `hsl(${(h + 55) % 360} 80% 38%)`, c: `hsl(${(h + 200) % 360} 90% 60%)` };
}

interface ArtProps {
  setId: string;
  setName: string;
  logo?: string;
  serieName?: string;
  /** Nombre de cartes du booster (selon l'ère) */
  packSize?: number;
  /** Vignette : sans textes, logo réduit */
  mini?: boolean;
}

/** Visuel de l'enveloppe (sans interaction) */
export function PackArt({ setId, setName, logo, serieName, packSize = 10, mini = false }: ArtProps) {
  const { a, b, c } = packColors(setId);
  const real = (PACK_ART as Record<string, string>)[setId];
  if (real) {
    // Visuel de booster fourni (public/boosters/<setId>.*)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={real}
        alt={mini ? "" : `Booster ${setName}`}
        className="absolute inset-0 w-full h-full object-contain select-none"
        draggable={false}
      />
    );
  }
  return (
    <div
      className="pack-crimp absolute inset-0 overflow-hidden rounded-[6px]"
      style={{ background: `linear-gradient(160deg, ${a} 0%, ${b} 70%, #0b0b18 100%)` } as CSSProperties}
    >
      {/* motif losanges */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `linear-gradient(45deg, ${c} 25%, transparent 25%), linear-gradient(-45deg, ${c} 25%, transparent 25%)`,
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, transparent 10%, #000 60%, transparent 95%)",
        }}
      />
      <div
        className="absolute -left-1/4 top-[38%] w-[150%] h-[38%] rotate-[-12deg] opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }}
      />
      <div className="absolute inset-0 pack-foil" />
      {/* bandes haut / bas */}
      <div className="absolute inset-x-0 top-0 h-[13%] bg-black/25 border-b border-white/20" />
      <div className="absolute inset-x-0 bottom-0 h-[9%] bg-black/30 border-t border-white/15" />

      <div className={`absolute inset-x-0 top-[19%] flex justify-center ${mini ? "px-1" : "px-5"}`}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={setAsset(logo)}
            alt={mini ? "" : setName}
            className={`${mini ? "max-h-8" : "max-h-24"} w-auto object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]`}
            draggable={false}
          />
        ) : (
          <span
            className={`font-display font-bold text-center text-white drop-shadow break-words ${
              mini ? "text-[9px] leading-tight line-clamp-3" : "text-2xl"
            }`}
          >
            {setName}
          </span>
        )}
      </div>

      {!mini && (
        <>
      <div className="absolute inset-x-0 bottom-[13%] text-center">
        <p className="font-display font-bold text-[13px] tracking-[0.35em] text-white/90 drop-shadow">BOOSTER</p>
        <p className="text-xs font-bold text-white/70 mt-0.5">{packSize} cartes · {serieName}</p>
      </div>
      <div className="absolute inset-x-0 bottom-[2.5%] text-center text-[8px] font-bold tracking-widest text-white/60">
        HOLOFOIL
      </div>
        </>
      )}
    </div>
  );
}

interface Props extends ArtProps {
  onTearStart?: () => void;
  onTorn: () => void;
  disabled?: boolean;
  /** Incrémenter pour déchirer sans geste (bouton accessible / clavier) */
  tearSignal?: number;
}

const TEAR_Y = 13; // % : hauteur de la ligne de déchirure

/** Booster à déchirer en glissant le doigt horizontalement sur le haut de l'enveloppe */
export function TearablePack(props: Props) {
  const { onTorn, onTearStart, disabled, tearSignal = 0 } = props;
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const progress = useMotionValue(0);
  const [torn, setTorn] = useState(false);
  const lastBuzz = useRef(0);

  const lineWidth = useTransform(progress, (p) => `${p * 100}%`);
  const capRotate = useTransform(progress, [0, 1], [0, -6]);
  const capY = useTransform(progress, [0, 1], [0, -6]);
  const glow = useTransform(progress, [0, 1], [0, 1]);

  const finish = () => {
    if (torn) return;
    setTorn(true);
    animate(progress, 1, { duration: 0.12 });
    navigator.vibrate?.([12, 30, 25]);
    setTimeout(onTorn, 650);
  };

  // Déchirure déclenchée par le bouton "Ouvrir" : la ligne se trace toute seule
  useEffect(() => {
    if (tearSignal === 0) return;
    const ctrl = animate(progress, 1, { duration: 0.7, ease: "easeInOut", onComplete: finish });
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tearSignal]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="relative w-[min(72vw,280px)] aspect-[5/8.2] touch-none select-none"
      onPointerDown={(e) => {
        if (disabled || torn) return;
        start.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
        onTearStart?.();
      }}
      onPointerMove={(e) => {
        if (!start.current || torn) return;
        const w = ref.current!.getBoundingClientRect().width;
        const p = Math.min(1, Math.abs(e.clientX - start.current.x) / (w * 0.75));
        if (p > progress.get()) progress.set(p);
        if (p - lastBuzz.current > 0.12) {
          lastBuzz.current = p;
          navigator.vibrate?.(4);
        }
        if (p >= 0.92) finish();
      }}
      onPointerUp={() => {
        start.current = null;
        if (!torn && progress.get() < 0.92) animate(progress, 0, { type: "spring", stiffness: 300, damping: 25 });
        lastBuzz.current = 0;
      }}
    >
      {/* Corps du booster */}
      <motion.div
        className="absolute inset-0"
        style={{ clipPath: `inset(${TEAR_Y}% 0 0 0)` }}
        animate={torn ? { y: 40, scale: 0.96 } : { y: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 14 }}
      >
        <PackArt {...props} />
      </motion.div>

      {/* Languette du haut */}
      <motion.div
        className="absolute inset-0 origin-[100%_13%]"
        style={{ clipPath: `inset(0 0 ${100 - TEAR_Y}% 0)`, rotate: capRotate, y: capY }}
        animate={torn ? { x: 220, y: -260, rotate: 55, opacity: 0 } : undefined}
        transition={{ duration: 0.7, ease: [0.3, 0.7, 0.4, 1] }}
      >
        <PackArt {...props} />
      </motion.div>

      {/* Ligne de déchirure lumineuse */}
      <motion.div
        className="absolute left-0 h-[3px] -translate-y-1/2 rounded-full pointer-events-none"
        style={{
          top: `${TEAR_Y}%`,
          width: lineWidth,
          opacity: glow,
          background: "linear-gradient(90deg, #fff, var(--volt))",
          boxShadow: "0 0 12px 3px rgba(255,225,77,0.9), 0 0 30px 6px rgba(255,61,154,0.6)",
        }}
      />

      {/* Lumière qui s'échappe du booster ouvert */}
      {torn && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-[120%] h-40 pointer-events-none"
          style={{
            top: `${TEAR_Y - 8}%`,
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.95), rgba(255,225,77,0.5) 35%, transparent 70%)",
          }}
          initial={{ opacity: 0, scaleY: 0.2 }}
          animate={{ opacity: [0, 1, 0.6], scaleY: [0.2, 1.4, 1] }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Indication de geste */}
      {!torn && !disabled && (
        <motion.div
          className="absolute left-[8%] pointer-events-none flex items-center gap-1"
          style={{ top: `calc(${TEAR_Y}% - 14px)` }}
          animate={{ x: [0, 150, 150], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.4 }}
        >
          <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">👆</span>
        </motion.div>
      )}
    </div>
  );
}
