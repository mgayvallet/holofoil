"use client";
import { useEffect, useRef, type PointerEvent } from "react";
import { useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * Inclinaison 3D d'une carte : suit la souris / le doigt, et le gyroscope sur mobile.
 * Renvoie les styles motion à appliquer + les handlers pointeur.
 */
export function useTilt({ max = 14, gyro = true, enabled = true } = {}) {
  const x = useMotionValue(50); // 0–100 %
  const y = useMotionValue(50);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const rotateY = useTransform(sx, [0, 100], [-max, max]);
  const rotateX = useTransform(sy, [0, 100], [max, -max]);
  const hyp = useTransform([sx, sy], ([a, b]: number[]) =>
    Math.min(1, Math.hypot(a - 50, b - 50) / 50).toFixed(3),
  );
  const mx = useMotionTemplate`${sx}%`;
  const my = useMotionTemplate`${sy}%`;
  const pointerActive = useRef(false);

  useEffect(() => {
    if (!gyro || !enabled || typeof window === "undefined") return;
    let base: { b: number; g: number } | null = null;
    const onOrient = (e: DeviceOrientationEvent) => {
      if (pointerActive.current || e.beta == null || e.gamma == null) return;
      // On calibre sur la première mesure : la position de tenue du téléphone = centre
      base ??= { b: e.beta, g: e.gamma };
      const g = Math.max(-25, Math.min(25, e.gamma - base.g));
      const b = Math.max(-25, Math.min(25, e.beta - base.b));
      x.set(50 + (g / 25) * 50);
      y.set(50 + (b / 25) * 50);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [gyro, enabled, x, y]);

  const handlers = enabled
    ? {
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          pointerActive.current = true;
          const r = e.currentTarget.getBoundingClientRect();
          x.set(((e.clientX - r.left) / r.width) * 100);
          y.set(((e.clientY - r.top) / r.height) * 100);
        },
        onPointerLeave: () => {
          pointerActive.current = false;
          x.set(50);
          y.set(50);
        },
      }
    : {};

  return {
    style: { rotateX, rotateY, "--mx": mx, "--my": my, "--hyp": hyp } as Record<string, unknown>,
    handlers,
  };
}

/** iOS exige une permission explicite (sur un geste utilisateur) pour le gyroscope */
export async function requestGyroPermission() {
  const DOE = (typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined) as
    | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
    | undefined;
  if (DOE?.requestPermission) {
    try {
      await DOE.requestPermission();
    } catch {}
  }
}

