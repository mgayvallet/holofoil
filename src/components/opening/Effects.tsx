"use client";
import { useMemo } from "react";
import { motion } from "motion/react";
import { Logo } from "../Logo";

/** Pseudo-aléatoire déterministe (rendu pur) */
const rand = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Explosion de particules autour du centre */
export function ParticleBurst({ color, count = 28, big = false }: { color: string; count?: number; big?: boolean }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + rand(i, 1) * 0.4;
        const dist = (big ? 180 : 120) + rand(i, 2) * (big ? 160 : 90);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 4 + rand(i, 3) * (big ? 10 : 6),
          delay: rand(i, 4) * 0.12,
          duration: 0.9 + rand(i, 6) * 0.5,
          star: rand(i, 5) > 0.6,
        };
      }),
    [count, big],
  );
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            background: p.star ? "#fff" : color,
            borderRadius: p.star ? "2px" : "999px",
            rotate: p.star ? 45 : 0,
            boxShadow: `0 0 ${p.size * 2}px ${color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.1, 0.8, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/** Flash plein écran */
export function Flash({ color = "#fff" }: { color?: string }) {
  return (
    <motion.div
      className="fixed inset-0 z-[70] pointer-events-none"
      style={{ background: color }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.95, 0] }}
      transition={{ duration: 0.55, times: [0, 0.15, 1] }}
    />
  );
}

/** Rayons tournants derrière une carte rare */
export function Rays({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2 w-[190%] aspect-square -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="rays w-full h-full rounded-full" style={{ "--ray": color } as never} />
    </motion.div>
  );
}

/** Dos de carte Holofoil (design maison, rien d'officiel) */
export function CardBack({ glow }: { glow?: string }) {
  return (
    <div
      className="holo-card w-full"
      style={{
        background:
          "radial-gradient(circle at 50% 45%, #2f7be0 0%, #1f5fbf 45%, #16213e 100%)",
        boxShadow: glow ? `0 0 40px 8px ${glow}, 0 0 90px 20px ${glow}55` : undefined,
      }}
    >
      <div className="absolute inset-[5%] rounded-[4%] border-4 border-[#ffcb05]/80" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #ffffff 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, #ffcb05 0 2px, transparent 2px 14px)",
        }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <Logo className="w-1/2 h-1/2 drop-shadow-[0_0_18px_rgba(255,203,5,0.55)]" />
      </div>
      <div className="absolute inset-x-0 bottom-[9%] text-center font-display font-bold tracking-[0.3em] text-white text-xs">
        HOLOFOIL
      </div>
    </div>
  );
}
