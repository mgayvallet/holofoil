"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { openBoosterAction } from "@/app/actions";
import type { OpenedCard, OpeningResult } from "@/lib/game/service";
import type { TimerState } from "@/lib/game/timer";
import { fxLevel, TIER_COLOR, TIER_LABEL } from "@/lib/booster/rarity";
import { cardImage } from "@/lib/tcgdex/ids";
import { HoloCard } from "../HoloCard";
import { TearablePack } from "../BoosterPack";
import { BoosterTimer } from "../BoosterTimer";
import { useToast } from "../Toasts";
import { requestGyroPermission } from "../useTilt";
import { CardBack, Flash, ParticleBurst, Rays } from "./Effects";
import { Coin } from "../Coin";

interface Props {
  /** Booster de catégorie : le set exact est tiré côté serveur à l'ouverture */
  booster: { id: string; name: string; logo?: string; serieName: string; packSize: number };
  timer: TimerState;
}

type Stage = "pack" | "loading" | "reveal" | "recap";

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

export function OpeningExperience({ booster, timer: initialTimer }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("pack");
  const [result, setResult] = useState<OpeningResult | null>(null);
  const [timer, setTimer] = useState(initialTimer);
  const [index, setIndex] = useState(0);
  const [packKey, setPackKey] = useState(0);
  const [tearSignal, setTearSignal] = useState(0);
  const reduce = useReducedMotion();
  const request = useRef<Promise<Awaited<ReturnType<typeof openBoosterAction>>> | null>(null);

  const canOpen = timer.available + timer.bonus > 0;

  // Le tirage serveur part dès que le joueur commence à déchirer : l'animation masque la latence
  const startRequest = useCallback(() => {
    requestGyroPermission();
    request.current ??= openBoosterAction(booster.id);
  }, [booster.id]);

  const onTorn = useCallback(async () => {
    setStage("loading");
    startRequest();
    const res = await request.current!;
    request.current = null;
    if (!res.ok) {
      toast({ icon: "⚠️", title: res.error, tone: "error" });
      setStage("pack");
      setTearSignal(0);
      setPackKey((k) => k + 1);
      return;
    }
    // On attend les premières images pour une révélation fluide (max 2,5 s)
    const imgs = res.data.cards.map((c) => preload(cardImage(c.image, "high")));
    await Promise.race([Promise.all(imgs.slice(0, 3)), new Promise((r) => setTimeout(r, 2500))]);
    setResult(res.data);
    setTimer(res.data.timer);
    setIndex(0);
    setStage("reveal");
  }, [startRequest, toast]);

  const finish = useCallback(() => {
    setStage("recap");
    result?.newAchievements.forEach((a, i) =>
      setTimeout(() => toast({ icon: a.icon, title: "Succès débloqué !", body: a.title, tone: "achievement" }), 600 + i * 700),
    );
    router.refresh();
  }, [result, router, toast]);

  const next = useCallback(() => {
    if (!result) return;
    if (index >= result.cards.length - 1) finish();
    else setIndex((i) => i + 1);
  }, [index, result, finish]);

  const again = () => {
    setResult(null);
    setTearSignal(0);
    setStage("pack");
    setPackKey((k) => k + 1);
  };

  return (
    <div className="relative min-h-[calc(100dvh-7rem)] flex flex-col items-center">
      <AnimatePresence mode="wait">
        {(stage === "pack" || stage === "loading") && (
          <motion.section
            key={`pack-${packKey}`}
            className="flex-1 w-full flex flex-col items-center justify-center gap-6 py-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: 60, transition: { duration: 0.3 } }}
          >
            <div className="text-center">
              <p className="text-muted text-sm font-bold">{booster.serieName}</p>
              <h1 className="font-display font-bold text-3xl">{booster.name}</h1>
            </div>
            <motion.div
              className="drop-shadow-[0_14px_22px_rgba(16,24,40,0.3)]"
              animate={stage === "pack" && !reduce ? { y: [0, -8, 0], rotate: [-1, 1, -1] } : { y: 0 }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <TearablePack
                setId={booster.id}
                setName={booster.name}
                logo={booster.logo}
                serieName={booster.serieName}
                packSize={booster.packSize}
                disabled={!canOpen}
                onTearStart={startRequest}
                onTorn={onTorn}
                tearSignal={tearSignal}
              />
            </motion.div>
            {stage === "loading" ? (
              <p className="text-muted font-bold" role="status">
                Les cartes sortent du booster…
              </p>
            ) : canOpen ? (
              <div className="text-center space-y-3">
                <p className="font-bold">
                  Glisse ton doigt sur le haut du booster pour le déchirer
                  <br />
                  <span className="text-muted font-semibold">ou</span>
                </p>
                <button
                  onClick={() => {
                    startRequest();
                    setTearSignal((n) => n + 1);
                  }}
                  className="press rounded-2xl bg-brand min-h-14 px-10 font-display font-bold text-xl"
                >
                  Ouvrir le booster
                </button>
              </div>
            ) : (
              <div className="glass rounded-3xl p-5 w-full max-w-sm text-center space-y-3">
                <p className="font-bold">Plus de booster pour l&apos;instant</p>
                <BoosterTimer initial={timer} compact />
                <Link href="/boutique" className="press inline-grid place-items-center rounded-2xl bg-brand px-5 min-h-12 font-bold">
                  Acheter un booster bonus
                </Link>
              </div>
            )}
          </motion.section>
        )}

        {stage === "reveal" && result && (
          <RevealStage
            key="reveal"
            cards={result.cards}
            setName={result.set.name}
            index={index}
            onNext={next}
            onSkip={finish}
          />
        )}

        {stage === "recap" && result && (
          <Recap key="recap" result={result} canOpenAgain={timer.available + timer.bonus > 0} onAgain={again} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------
// Révélation carte par carte
// ------------------------------------------------------------------

function RevealStage({
  cards,
  setName,
  index,
  onNext,
  onSkip,
}: {
  cards: OpenedCard[];
  setName: string;
  index: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [dir, setDir] = useState(1);
  const isLast = index === cards.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onSkip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <motion.section
      role="dialog"
      aria-modal="true"
      aria-label="Ouverture du booster"
      className="theme-dark fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#0b1122]/[0.97]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Barre du haut */}
      <div className="absolute top-0 inset-x-0 pt-[max(1rem,env(safe-area-inset-top))] px-4 flex items-center justify-between gap-3 z-40">
        <div className="flex items-center gap-3">
          <ol className="flex gap-1" aria-hidden>
            {cards.map((c, i) => (
              <li
                key={i}
                className="h-2 w-4 sm:w-5 rounded-full"
                style={{ background: i <= index ? TIER_COLOR[c.tier] : "var(--line)" }}
              />
            ))}
          </ol>
          <span className="text-sm font-bold tabular-nums">
            {index + 1}/{cards.length}
          </span>
          <span className="hidden sm:inline text-sm text-muted font-bold truncate">· {setName}</span>
        </div>
        <button onClick={onSkip} className="press rounded-full bg-surface-2 px-4 min-h-11 text-sm font-bold">
          Tout voir <span className="sr-only">(touche Échap)</span>
        </button>
      </div>

      <AnimatePresence mode="popLayout">
        <RevealCard
          key={index}
          card={cards[index]}
          position={`${index + 1} sur ${cards.length}`}
          isLast={isLast}
          dir={dir}
          onAdvance={(d) => {
            setDir(d);
            onNext();
          }}
        />
      </AnimatePresence>
    </motion.section>
  );
}

/** Une carte révélée : son état (face cachée / chargement / retournée) lui est propre */
function RevealCard({
  card,
  position,
  isLast,
  dir,
  onAdvance,
}: {
  card: OpenedCard;
  position: string;
  isLast: boolean;
  dir: number;
  onAdvance: (dir: number) => void;
}) {
  const reduce = useReducedMotion();
  const fx = fxLevel(card.tier, card.reverse);
  const color = TIER_COLOR[card.tier];
  // Les cartes rares (fx ≥ 2) arrivent face cachée : il faut les retourner
  const [flipped, setFlipped] = useState(fx < 2);
  const [charging, setCharging] = useState(false);
  const [burst, setBurst] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const flip = () => {
    if (flipped || charging) return;
    if (fx >= 3 && !reduce) {
      // Suspense : la carte tremble et se charge avant de se révéler
      setCharging(true);
      navigator.vibrate?.([20, 40, 20, 40, 60]);
      setTimeout(() => {
        setCharging(false);
        setFlipped(true);
        setBurst(true);
        navigator.vibrate?.(120);
      }, 1300);
    } else {
      setFlipped(true);
      setBurst(true);
      navigator.vibrate?.(40);
    }
  };

  const advance = (d = 1) => (flipped ? onAdvance(d) : flip());

  // Clavier : Entrée / Espace / → ; le focus reste sur le bouton d'action
  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, [flipped]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advance(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const effects = !reduce;

  return (
    <motion.div
      className="relative flex flex-col items-center w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      {/* Annonce pour lecteurs d'écran */}
      <p className="sr-only" aria-live="assertive">
        {flipped
          ? `Carte ${position} : ${card.name}, ${card.rarity}${card.reverse ? ", Reverse" : ""}${card.isNew ? ", nouvelle carte" : ""}.`
          : `Carte ${position} : carte rare face cachée. Appuie sur Retourner.`}
      </p>

      {/* Fond selon la rareté */}
      {flipped && fx >= 2 && effects && <Rays color={color} />}
      {fx >= 3 && (charging || flipped) && effects && (
        <motion.div
          className="fixed inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 45%, ${color}55, transparent 60%)` }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}

      <div className="relative w-[min(72vw,320px,45dvh)]">
        {/* Carte suivante en dessous (profondeur) */}
        {!isLast && (
          <div className="absolute inset-0 translate-y-3 scale-[0.94] opacity-50 pointer-events-none" aria-hidden>
            <CardBack />
          </div>
        )}

        <motion.div
          className="relative cursor-pointer"
          aria-hidden
          drag={flipped ? "x" : false}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 500) advance(info.offset.x > 0 ? 1 : -1);
          }}
          onTap={() => advance(1)}
          initial={{ y: reduce ? 0 : 80, scale: reduce ? 1 : 0.85, opacity: 0 }}
          animate={
            charging
              ? { x: [0, -6, 6, -8, 8, -4, 4, 0], scale: 1.04, opacity: 1, y: 0, transition: { duration: 0.32, repeat: 3 } }
              : { y: 0, x: 0, scale: 1, opacity: 1, rotate: 0 }
          }
          exit={reduce ? { opacity: 0 } : { x: dir * 420, rotate: dir * 25, opacity: 0, transition: { duration: 0.35 } }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <motion.div
            className="relative [transform-style:preserve-3d]"
            initial={{ rotateY: flipped ? 0 : 180 }}
            animate={{ rotateY: flipped ? 0 : 180 }}
            transition={{ duration: reduce ? 0 : fx >= 3 ? 0.9 : 0.6, ease: [0.3, 1.2, 0.5, 1] }}
          >
            <div className="[backface-visibility:hidden]">
              <HoloCard cardId={card.cardId} image={card.image} name={card.name} rarity={card.rarity} reverse={card.reverse} priority />
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <CardBack glow={color} />
            </div>
          </motion.div>

          {card.isNew && flipped && (
            <motion.span
              className="absolute -top-3 -left-3 z-20 rounded-full bg-volt text-ink font-display font-bold text-sm px-3 py-1.5 shadow-lg"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: -10 }}
              transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.25 }}
            >
              NOUVEAU
            </motion.span>
          )}
        </motion.div>

        {burst && fx >= 2 && effects && <ParticleBurst color={color} big={fx >= 3} count={fx >= 3 ? 48 : 28} />}
      </div>
      {burst && fx >= 2 && effects && <Flash color={fx >= 3 ? color : "#fff"} />}

      {/* Infos carte (texte, pas seulement la couleur) */}
      <div className="mt-5 min-h-20 text-center px-6">
        {flipped ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p className="font-display font-bold text-2xl">{card.name}</p>
            <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
              <span className="rounded-full px-3 py-1 text-sm font-bold text-ink" style={{ background: color }}>
                {card.rarity}
              </span>
              {card.reverse && (
                <span className="rounded-full px-3 py-1 text-sm font-bold bg-surface-2 border border-cyan text-cyan">
                  Reverse
                </span>
              )}
              <span className="rounded-full px-3 py-1 text-sm font-bold bg-surface-2 flex items-center gap-1">
                <Coin /> {card.value} <span className="sr-only">pièces</span>
              </span>
            </div>
          </motion.div>
        ) : (
          <p className="font-display font-bold text-xl" style={{ color }}>
            {charging ? "…" : fx >= 3 ? "✦ Quelque chose d'exceptionnel ✦" : "Quelque chose brille…"}
          </p>
        )}
      </div>

      {/* Action explicite (accessible au clavier et aux lecteurs d'écran) */}
      <button
        ref={button}
        onClick={() => advance(1)}
        disabled={charging}
        className="press mt-3 rounded-2xl bg-brand min-h-14 px-8 font-display font-bold text-lg disabled:opacity-60"
      >
        {!flipped ? "Retourner la carte" : isLast ? "Voir le récapitulatif" : "Carte suivante"}
      </button>
      <p className="mt-2 text-sm text-muted">ou touche / glisse la carte</p>
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Récapitulatif
// ------------------------------------------------------------------

function Recap({ result, canOpenAgain, onAgain }: { result: OpeningResult; canOpenAgain: boolean; onAgain: () => void }) {
  const newCount = result.cards.filter((c) => c.isNew).length;
  const best = result.cards[result.cards.length - 1];
  return (
    <motion.section
      className="w-full max-w-2xl py-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center mb-5">
        <p className="text-muted font-bold text-sm">
          Booster {result.category.name} · tiré de <span className="text-text">{result.set.name}</span>
        </p>
        <h1 ref={(el) => el?.focus({ preventScroll: true })} tabIndex={-1} className="font-display font-bold text-3xl outline-none">
          Ton booster
        </h1>
        <div className="mt-3 flex justify-center gap-2 flex-wrap text-sm font-bold">
          <span className="rounded-full bg-surface-2 px-3 py-1.5 flex items-center gap-1.5">
            Valeur <Coin /> {result.value.toLocaleString("fr-FR")}
          </span>
          {newCount > 0 && (
            <span className="rounded-full bg-volt text-ink px-3 py-1.5">
              {newCount} nouvelle{newCount > 1 ? "s" : ""}
            </span>
          )}
          <span className="rounded-full px-3 py-1.5 text-ink" style={{ background: TIER_COLOR[best.tier] }}>
            Meilleure : {TIER_LABEL[best.tier]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
        {result.cards.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
          >
            <Link href={`/carte/${c.cardId}`} className="press block">
              <HoloCard cardId={c.cardId} image={c.image} name={c.name} rarity={c.rarity} reverse={c.reverse} size="low" interactive={false} />
            </Link>
            {c.isNew && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-volt text-ink text-[11px] font-black px-1.5 py-0.5">
                NEW
              </span>
            )}
            <span
              className="absolute bottom-1 left-1 h-2 w-2 rounded-full ring-2 ring-bg"
              style={{ background: TIER_COLOR[c.tier] }}
            />
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {canOpenAgain ? (
          <button onClick={onAgain} className="press rounded-2xl bg-brand py-4 font-display font-bold text-ink text-lg">
            Ouvrir un autre booster
          </button>
        ) : (
          <Link href="/" className="press rounded-2xl bg-brand py-4 font-display font-bold text-ink text-lg text-center">
            Retour à l&apos;accueil
          </Link>
        )}
        <Link
          href={`/collection/${result.set.id}`}
          className="press rounded-2xl bg-surface-2 py-4 font-display font-bold text-lg text-center"
        >
          Voir mon classeur
        </Link>
      </div>
    </motion.section>
  );
}
