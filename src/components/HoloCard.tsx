"use client";
import { motion, useReducedMotion } from "motion/react";
import { fxLevel, tierOf, TIER_COLOR } from "@/lib/booster/rarity";
import { cardImage, imageFallback } from "@/lib/tcgdex/ids";
import { useTilt } from "./useTilt";

interface Props {
  /** Id de la carte : sert à afficher la carte de remplacement si l'image échoue */
  cardId?: string;
  image: string;
  name: string;
  rarity: string;
  reverse?: boolean;
  size?: "low" | "high";
  /** Inclinaison 3D + reflets interactifs */
  interactive?: boolean;
  /** Effets holo même hors interaction (ex : miniatures du classeur) */
  effects?: boolean;
  className?: string;
  priority?: boolean;
}

/** Carte avec effet holographique 3D (reflet, arc-en-ciel, paillettes selon la rareté) */
export function HoloCard({
  cardId,
  image,
  name,
  rarity,
  reverse = false,
  size = "high",
  interactive = true,
  effects = true,
  className = "",
  priority = false,
}: Props) {
  const tier = tierOf(rarity);
  const fx = fxLevel(tier, reverse);
  const gold = tier === "special" || tier === "hyper" || tier === "megaHyper";
  // Pas d'inclinaison 3D si l'utilisateur a demandé moins d'animations
  const reduce = useReducedMotion();
  const { style, handlers } = useTilt({ enabled: interactive && !reduce });

  const classes = [
    "holo-card",
    `fx-${fx}`,
    reverse && fx <= 1 ? "fx-reverse" : "",
    gold ? "fx-gold" : "",
    className,
  ].join(" ");

  return (
    <div className="[perspective:900px]" {...handlers}>
      <motion.div
        className={classes}
        style={{ ...(interactive ? style : {}), "--accent": TIER_COLOR[tier] } as never}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardImage(image, size)}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onError={cardId ? imageFallback(cardId) : undefined}
        />
        {effects && fx >= 1 && <div className="holo-shine" />}
        {effects && fx >= 2 && <div className="holo-sparkle" />}
        {interactive && <div className="holo-glare" />}
      </motion.div>
    </div>
  );
}
