import { requireProfile } from "@/lib/auth";
import { GAME } from "@/lib/config";
import { getDuplicates } from "@/lib/game/service";
import { Shop } from "./Shop";
import { hasUnlimitedCoins } from "@/lib/game/demo";

export const metadata = { title: "Boutique" };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const profile = await requireProfile();
  const dups = await getDuplicates(profile.id);
  return (
    <Shop
      coins={profile.coins}
      unlimited={hasUnlimitedCoins(profile.id)}
      bonusBoosters={profile.bonusBoosters}
      price={GAME.bonusBoosterPrice}
      duplicates={dups.map((d) => ({
        cardId: d.card.id,
        name: d.card.name,
        image: d.card.image,
        rarity: d.card.rarity,
        quantity: d.quantity,
        sellable: d.sellable,
        unitPrice: d.unitPrice,
      }))}
    />
  );
}
