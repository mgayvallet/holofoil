import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { store } from "@/lib/store";
import { cardValue, tierOf, TIER_COLOR } from "@/lib/booster/rarity";
import { getCardDetail, getCardLite, NotFoundError } from "@/lib/tcgdex/api";
import { cardImage, setAsset, setIdFromCardId } from "@/lib/tcgdex/ids";
import { HoloCard } from "@/components/HoloCard";
import { Coin } from "@/components/Coin";
import type { TcgCard } from "@/lib/tcgdex/types";

export const dynamic = "force-dynamic";

async function load(cardId: string): Promise<TcgCard | null> {
  try {
    return await getCardDetail(decodeURIComponent(cardId));
  } catch (e) {
    if (e instanceof NotFoundError) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps<"/carte/[cardId]">) {
  const card = await load((await params).cardId);
  return { title: card ? `${card.name} · ${card.set.name}` : "Carte" };
}

export default async function CardPage({ params }: PageProps<"/carte/[cardId]">) {
  const { cardId } = await params;
  const profile = await requireProfile();
  const card = await load(cardId);
  if (!card) notFound();
  // Même cascade d'images que le classeur (TCGdex FR/EN → pokemontcg.io → carte générée)
  const lite = await getCardLite(card.id);
  const image = lite?.image ?? card.image ?? `gen:${card.id}`;
  const owned = await store().getUserCard(profile.id, card.id);
  const qty = owned?.quantity ?? 0;
  const tier = tierOf(card.rarity);
  const color = TIER_COLOR[tier];

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/collection/${setIdFromCardId(card.id)}`} className="press inline-flex text-sm font-bold text-muted mb-4">
        ← {card.set.name}
      </Link>

      <div className="grid md:grid-cols-[minmax(0,380px)_1fr] gap-8 items-start">
        <div className="relative mx-auto w-[min(82vw,380px)]">
          <div
            className="absolute -inset-10 -z-10 blur-3xl opacity-40 rounded-full"
            style={{ background: `radial-gradient(circle, ${color}, transparent 65%)` }}
          />
          {qty > 0 ? (
            <HoloCard cardId={card.id} image={image} name={card.name} rarity={card.rarity ?? ""} priority />
          ) : (
            <div className="holo-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardImage(image, "high")} alt="Carte non obtenue" className="card-missing" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="rounded-full bg-bg/80 px-4 py-2 font-display font-bold text-sm">Pas encore obtenue</span>
              </div>
            </div>
          )}
          <p className="mt-3 text-center text-xs text-muted font-bold">
            {qty > 0 ? "Bouge ton téléphone ou ta souris pour l'effet holo ✨" : "Ouvre des boosters de ce set pour la trouver"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {card.set.symbol && <img src={setAsset(card.set.symbol)} alt="" className="h-4" />}
              {card.set.name} · n°{card.localId}
            </div>
            <h1 className="font-display font-bold text-3xl mt-1">
              {card.name}
              {card.hp ? <span className="text-muted text-lg ml-2">{card.hp} PV</span> : null}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1 text-xs font-black text-ink" style={{ background: color }}>
                {card.rarity}
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-bold bg-surface-2">{card.category}</span>
              {card.types?.map((t) => (
                <span key={t} className="rounded-full px-3 py-1 text-xs font-bold bg-surface-2">
                  {t}
                </span>
              ))}
              {card.stage && <span className="rounded-full px-3 py-1 text-xs font-bold bg-surface-2">{card.stage}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-2xl p-3">
              <p className="text-xs text-muted font-bold">Exemplaires</p>
              <p className="font-display font-bold text-2xl">×{qty}</p>
            </div>
            <div className="glass rounded-2xl p-3">
              <p className="text-xs text-muted font-bold">Revente</p>
              <p className="font-display font-bold text-2xl flex items-center gap-1.5">
                <Coin className="w-4 h-4" /> {cardValue(card.rarity)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {qty > 1 && (
              <Link href="/boutique" className="press flex-1 text-center rounded-2xl bg-surface-2 py-3 font-bold text-sm">
                Vendre un doublon
              </Link>
            )}
            {qty === 0 && (
              <Link
                href={`/echanges/nouveau?carte=${encodeURIComponent(card.id)}`}
                className="press flex-1 text-center rounded-2xl bg-brand text-ink py-3 font-black text-sm"
              >
                Chercher en échange
              </Link>
            )}
          </div>

          {card.evolveFrom && <Info label="Évolue de">{card.evolveFrom}</Info>}
          {card.description && <p className="text-sm text-muted italic">{card.description}</p>}
          {card.effect && <Info label="Effet">{card.effect}</Info>}

          {card.abilities?.map((a) => (
            <div key={a.name} className="glass rounded-2xl p-3">
              <p className="text-xs font-black text-pink">{a.type}</p>
              <p className="font-bold">{a.name}</p>
              <p className="text-sm text-muted mt-1">{a.effect}</p>
            </div>
          ))}

          {card.attacks?.map((a) => (
            <div key={a.name} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">
                  <span className="text-xs text-muted mr-2">{a.cost?.join(" · ")}</span>
                  {a.name}
                </p>
                {a.damage != null && <p className="font-display font-bold">{a.damage}</p>}
              </div>
              {a.effect && <p className="text-sm text-muted mt-1">{a.effect}</p>}
            </div>
          ))}

          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Faiblesse" value={card.weaknesses?.map((w) => `${w.type} ${w.value ?? ""}`).join(", ") || "—"} />
            <Mini label="Résistance" value={card.resistances?.map((w) => `${w.type} ${w.value ?? ""}`).join(", ") || "—"} />
            <Mini label="Retraite" value={card.retreat != null ? String(card.retreat) : "—"} />
          </div>

          <div className="text-xs text-muted space-y-0.5">
            {card.illustrator && <p>Illustration : {card.illustrator}</p>}
            {card.regulationMark && <p>Marque de régulation : {card.regulationMark}</p>}
            {card.variants && (
              <p>
                Variantes :{" "}
                {Object.entries(card.variants)
                  .filter(([, v]) => v)
                  .map(([k]) => ({ normal: "Normale", reverse: "Reverse", holo: "Holo", firstEdition: "1re édition" })[k] ?? k)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-xs text-muted font-bold">{label}</p>
      <p className="text-sm mt-0.5">{children}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-2.5">
      <p className="text-xs text-muted font-bold">{label}</p>
      <p className="text-xs font-bold mt-0.5">{value}</p>
    </div>
  );
}
