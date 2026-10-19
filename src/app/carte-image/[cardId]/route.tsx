import { ImageResponse } from "next/og";
import { getCardLite, getSetSummary } from "@/lib/tcgdex/api";
import { setIdFromCardId } from "@/lib/tcgdex/ids";
import { tierOf, TIER_COLOR } from "@/lib/booster/rarity";

/**
 * Carte de remplacement pour les rares cartes dont aucune image n'existe
 * (ni TCGdex FR/EN, ni pokemontcg.io) : elle reste collectionnable et lisible.
 */
export async function GET(_req: Request, ctx: RouteContext<"/carte-image/[cardId]">) {
  const { cardId: raw } = await ctx.params;
  const cardId = decodeURIComponent(raw);
  const [card, set] = await Promise.all([
    getCardLite(cardId).catch(() => null),
    getSetSummary(setIdFromCardId(cardId)).catch(() => null),
  ]);
  const color = TIER_COLOR[tierOf(card?.rarity ?? "")];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: 14,
          background: "#ffcb05",
          borderRadius: 22,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#f4f6fb",
            borderRadius: 12,
            padding: 22,
            color: "#16213e",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 34, fontWeight: 800, maxWidth: 420 }}>{card?.name ?? cardId}</span>
            {card?.hp ? <span style={{ fontSize: 26, fontWeight: 700 }}>{card.hp} PV</span> : null}
          </div>
          <div
            style={{
              marginTop: 18,
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: `linear-gradient(135deg, ${color}, #1f5fbf)`,
              color: "white",
              fontSize: 30,
              fontWeight: 700,
              textAlign: "center",
              padding: 30,
            }}
          >
            Image non disponible
          </div>
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", fontSize: 24 }}>
            <span style={{ fontWeight: 700 }}>{card?.rarity ?? ""}</span>
            <span>{[card?.category, ...(card?.types ?? [])].filter(Boolean).join(" · ")}</span>
            <span style={{ marginTop: 10, fontSize: 22, color: "#475272" }}>
              {set?.name ?? setIdFromCardId(cardId)} · n°{card?.localId ?? "?"}
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 600, height: 838, headers: { "Cache-Control": "public, max-age=604800" } },
  );
}
