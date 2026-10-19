/**
 * Test de bout en bout de la logique de jeu en mode local (sans UI).
 * Utilise un dossier de données jetable :
 *   HOLOFOIL_DATA_DIR=/tmp/hf-test node --conditions=react-server --import tsx scripts/test-flow.mts
 */
import assert from "node:assert/strict";
import { localStore as s, localAccounts } from "../src/lib/store/local";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { buyBooster, openBooster, sellDuplicates, getDuplicates, evaluateAchievements, getLeaderboard } from "../src/lib/game/service";
import { getCategories } from "../src/lib/game/categories";
import { tierRank } from "../src/lib/booster/rarity";
import { createSessionToken, readSessionToken, localUserId } from "../src/lib/session";
import { DEMO_ACCOUNT, GAME } from "../src/lib/config";
import { hasUnlimitedCoins } from "../src/lib/game/demo";
import { availableBoosters } from "../src/lib/game/timer";

const a = await s.ensureProfile("t-a", "Alice");
const b = await s.ensureProfile("t-b", "Bob");
const categories = await getCategories();
const set = categories.find((c) => c.id === "base")!; // booster "Set de Base" : 11 cartes, plusieurs sets
console.log(`${categories.length} boosters de catégorie : ${categories.map((c) => c.name).join(", ")}`);

// 15 boosters de départ (réserve pleine), puis plus rien
for (let i = 0; i < GAME.startingBoosters; i++) {
  const r = await openBooster((await s.getProfile(a.id))!, set.id);
  assert.equal(r.cards.length, set.packSize);
  // aucune carte en double dans un booster
  assert.equal(new Set(r.cards.map((c) => c.cardId)).size, r.cards.length);
  // le set tiré appartient bien à la catégorie
  assert.ok(set.sets.some((x) => x.id === r.set.id));
  // triées de la moins rare à la plus rare
  assert.ok(r.cards.every((c, j) => j === 0 || tierRank(c.tier) >= tierRank(r.cards[j - 1].tier)));
  console.log(`A booster ${i + 1} (${r.set.name}): ${r.cards.at(-1)!.rarity}, ${r.cards.filter((c) => c.isNew).length} nouvelles, timer ${r.timer.available}`);
}
await assert.rejects(openBooster((await s.getProfile(a.id))!, set.id), /Aucun booster/);
await assert.rejects(openBooster((await s.getProfile(a.id))!, "set-inexistant"), /n'existe pas/);
console.log("✓ limite de boosters et set inexistant refusés");

// Booster bonus
await s.buyBonusBooster(a.id, 150);
assert.equal((await s.getProfile(a.id))!.coins, 50);
const bonus = await openBooster((await s.getProfile(a.id))!, set.id);
assert.equal(bonus.timer.bonus, 0);
await assert.rejects(s.buyBonusBooster(a.id, 150), /Pas assez/);
console.log("✓ achat + ouverture booster bonus");

// Vente des doublons
const dups = await getDuplicates(a.id);
if (dups.length) {
  const before = (await s.getProfile(a.id))!.coins;
  const res = await sellDuplicates(a.id, "all");
  assert.equal(res.coins, before + res.earned);
  assert.equal((await getDuplicates(a.id)).length, 0);
  for (const d of dups) assert.equal((await s.getUserCard(a.id, d.card.id))!.quantity, 1);
  console.log(`✓ vente de ${dups.length} doublons pour ${res.earned} pièces, 1 exemplaire gardé`);
}
await assert.rejects(sellDuplicates(a.id, [{ cardId: (await s.getUserCards(a.id))[0].cardId, quantity: 1 }]), /garder/);
console.log("✓ impossible de vendre son dernier exemplaire");

// Échange
await openBooster((await s.getProfile(b.id))!, set.id);
const aCards = await s.getUserCards(a.id);
const bCards = await s.getUserCards(b.id);
const give = aCards[0].cardId;
const want = bCards.find((c) => c.cardId !== give)!.cardId;
const qa = (await s.getUserCard(a.id, want))?.quantity ?? 0;
const t = await s.createTrade(a.id, b.id, give, want);
await assert.rejects(s.respondTrade(t.id, a.id, true), /introuvable/); // seul le destinataire accepte
const done = await s.respondTrade(t.id, b.id, true);
assert.equal(done.status, "accepted");
assert.equal((await s.getUserCard(a.id, want))!.quantity, qa + 1);
assert.ok(await s.getUserCard(b.id, give));
await assert.rejects(s.respondTrade(t.id, b.id, true), /déjà traité/);
console.log("✓ échange accepté, cartes transférées, double acceptation refusée");

const ach = [...(await s.getAchievements(a.id)).map((x) => x.id), ...(await evaluateAchievements(a.id)).map((x) => x.id)];
assert.ok(ach.includes("first_booster") && ach.includes("first_trade"));
console.log("✓ succès :", ach.join(", "));

const lb = await getLeaderboard();
assert.equal(lb.length, 2);
console.log("✓ classement :", lb.map((l) => `${l.username}=${l.unique}`).join(" "));
// Amis
assert.equal(await s.sendFriendRequest(a.id, b.id), "sent");
await assert.rejects(s.sendFriendRequest(a.id, b.id), /déjà envoyée/);
await assert.rejects(s.sendFriendRequest(a.id, a.id), /toi-même/);
assert.equal((await s.listFriendships(b.id))[0].direction, "incoming");
assert.equal(await s.sendFriendRequest(b.id, a.id), "accepted"); // demande croisée = acceptation
assert.equal((await s.listFriendships(a.id))[0].status, "accepted");
await assert.rejects(s.sendFriendRequest(a.id, b.id), /déjà amis/);
await s.removeFriend(b.id, a.id);
assert.equal((await s.listFriendships(a.id)).length, 0);
await s.sendFriendRequest(b.id, a.id);
await s.respondFriendRequest(a.id, b.id, false);
assert.equal((await s.listFriendships(b.id)).length, 0);
console.log("✓ amis : demande, doublon refusé, acceptation croisée, retrait, refus");

// Sessions signées : une session modifiée doit être rejetée
const token = await createSessionToken({ uid: "local-alice", name: "Alice" });
assert.equal((await readSessionToken(token))?.uid, "local-alice");
const [payload, sig] = token.split(".");
const forged = Buffer.from(JSON.stringify({ uid: "local-pirate", name: "Pirate", exp: 9e9 })).toString("base64url");
assert.equal(await readSessionToken(`${forged}.${sig}`), null);
assert.equal(await readSessionToken(`${payload}.${sig.slice(0, -2)}xx`), null);
assert.equal(await readSessionToken("n'importe-quoi"), null);
console.log("✓ sessions : signature vérifiée, sessions falsifiées rejetées");

// Comptes : mot de passe haché, vérification, pseudo unique
const h = await hashPassword("super-secret-42");
assert.ok(h.startsWith("scrypt$") && !h.includes("super-secret-42"));
assert.equal(await verifyPassword("super-secret-42", h), true);
assert.equal(await verifyPassword("mauvais-mdp", h), false);
assert.notEqual(await hashPassword("super-secret-42"), h); // sel aléatoire
assert.equal(await localAccounts.register("local-ondine", "Ondine", h, false), "created");
assert.equal(await localAccounts.register("local-ondine", "ondine", h, false), "taken");
assert.equal(await localAccounts.getHash("local-ondine"), h);
assert.equal(await localAccounts.getHash("local-inconnu"), undefined);
console.log("✓ comptes : scrypt salé, mauvais mot de passe refusé, pseudo unique");

// Compte de démo : pièces illimitées ; réserve max 15 pour tous
const demo = await s.ensureProfile(localUserId(DEMO_ACCOUNT.username), DEMO_ACCOUNT.username);
assert.ok(hasUnlimitedCoins(demo.id) && !hasUnlimitedCoins(a.id));
for (let i = 0; i < 3; i++) await buyBooster(demo.id);
const demoAfter = (await s.getProfile(demo.id))!;
assert.equal(demoAfter.coins, demo.coins);
assert.equal(demoAfter.bonusBoosters, demo.bonusBoosters + 3);
assert.equal(GAME.maxStoredBoosters, 15);
assert.equal(availableBoosters(Date.now() - 1000 * 60 * 60 * 24), 15);
console.log("✓ démo : achats gratuits (pièces illimitées) ; réserve plafonnée à 15");

console.log("TOUS LES TESTS PASSENT");
