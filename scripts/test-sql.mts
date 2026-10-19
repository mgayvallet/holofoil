/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Vérifie le schéma Supabase (supabase/migrations) sur un vrai Postgres embarqué (PGlite) :
 * tables, RLS, fonctions de jeu atomiques. Les éléments propres à Supabase (auth.users,
 * auth.uid(), rôles anon/authenticated/service_role) sont simulés.
 *   npx tsx scripts/test-sql.mts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
  -- Droits par défaut de Supabase : TOUT est accordé aux rôles clients ; la sécurité repose sur la RLS et les revoke
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);
for (const f of fs.readdirSync("supabase/migrations").sort()) {
  await db.exec(fs.readFileSync(`supabase/migrations/${f}`, "utf8"));
  console.log("✓ migration", f);
}

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const q = async <T = any,>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const fails = async (sql: string, params: unknown[], re: RegExp) => {
  await assert.rejects(db.query(sql, params), (e: Error) => re.test(e.message), sql);
};

for (const [id, name] of [[A, "Alice"], [B, "Bob"]]) {
  await q("insert into auth.users values ($1)", [id]);
  // comme l'app : 15 boosters de départ = ancre 150 min dans le passé
  await q("insert into profiles (id, username, booster_anchor) values ($1, $2, now() - interval '150 minutes')", [id, name]);
  await q("insert into wallet (user_id, coins) values ($1, 200)", [id]);
}
console.log("✓ profils + portefeuilles");

// --- Ouverture : consommation atomique, cartes nouvelles, plafond ---
const pack = (ids: string[]) => JSON.stringify(ids.map((cardId) => ({ cardId })));
const open = (u: string, ids: string[]) =>
  q<{ commit_opening: any }>("select commit_opening($1, 'sv01', $2::jsonb, 100, 600, 15)", [u, pack(ids)]);
let r = (await open(A, ["sv01-001", "sv01-002", "sv01-001"]))[0].commit_opening;
assert.equal(r.source, "free");
assert.deepEqual(r.newCardIds, ["sv01-001", "sv01-002"]);
assert.equal((await q("select quantity from user_cards where user_id=$1 and card_id='sv01-001'", [A]))[0].quantity, 2);
for (let i = 1; i < 15; i++) await open(A, ["sv01-003"]);
await fails("select commit_opening($1, 'sv01', $2::jsonb, 1, 600, 15)", [A, pack(["sv01-004"])], /NO_BOOSTER/);
console.log("✓ commit_opening : 15 boosters puis NO_BOOSTER, cartes nouvelles détectées");

// --- Booster bonus ---
await q("select buy_bonus_booster($1, 150)", [A]);
assert.equal((await q("select coins from wallet where user_id=$1", [A]))[0].coins, 50);
await fails("select buy_bonus_booster($1, 150)", [A], /NOT_ENOUGH_COINS/);
r = (await open(A, ["sv01-005"]))[0].commit_opening;
assert.equal(r.source, "bonus");
console.log("✓ buy_bonus_booster + ouverture bonus");

// --- Vente : on garde toujours 1 exemplaire ---
const sale = (await q("select sell_cards($1, $2::jsonb)", [A, JSON.stringify([{ cardId: "sv01-003", quantity: 13, unitPrice: 5 }])]))[0].sell_cards;
assert.equal(sale.earned, 65);
assert.equal((await q("select quantity from user_cards where user_id=$1 and card_id='sv01-003'", [A]))[0].quantity, 1);
await fails("select sell_cards($1, $2::jsonb)", [A, JSON.stringify([{ cardId: "sv01-003", quantity: 1, unitPrice: 5 }])], /NOT_ENOUGH_CARDS/);
console.log("✓ sell_cards : gain crédité, dernier exemplaire protégé");

// --- Échange (avec carte de sous-set : le set de classeur suit) ---
await q("insert into user_cards (user_id, card_id, set_id, quantity) values ($1, 'swsh9tg-TG01', 'swsh9', 1)", [B]);
const [t] = await q("insert into trades (from_user, to_user, offer_card_id, request_card_id) values ($1, $2, 'sv01-002', 'swsh9tg-TG01') returning id", [A, B]);
await fails("select respond_trade($1, $2, true)", [t.id, A], /TRADE_INVALID/); // seul le destinataire
assert.equal((await q("select respond_trade($1, $2, true)", [t.id, B]))[0].respond_trade, "accepted");
const got = await q("select set_id, quantity from user_cards where user_id=$1 and card_id='swsh9tg-TG01'", [A]);
assert.deepEqual(got, [{ set_id: "swsh9", quantity: 1 }]);
assert.equal((await q("select count(*)::int n from user_cards where user_id=$1 and card_id='sv01-002'", [A]))[0].n, 0);
await fails("select respond_trade($1, $2, true)", [t.id, B], /TRADE_INVALID/);
console.log("✓ respond_trade : transfert, set de sous-set conservé, double acceptation refusée");

// --- Amis ---
assert.equal((await q("select send_friend_request($1, $2, 200)", [A, B]))[0].send_friend_request, "sent");
await fails("select send_friend_request($1, $2, 200)", [A, B], /déjà envoyée/);
assert.equal((await q("select send_friend_request($1, $2, 200)", [B, A]))[0].send_friend_request, "accepted");
await fails("select send_friend_request($1, $2, 200)", [A, A], /soi-même/);
console.log("✓ send_friend_request : envoi, doublon, acceptation croisée");

// --- Classement ---
const lb = await q("select * from leaderboard_rows() order by user_id, set_id");
assert.ok(lb.some((r) => r.user_id === A && r.set_id === "sv01"));
console.log("✓ leaderboard_rows");

// --- Sécurité : RLS et droits des clients (rôle authenticated = Alice) ---
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${A}', false);`);
assert.equal((await q("select count(*)::int n from wallet")).at(0).n, 1); // ne voit que son portefeuille
assert.equal((await q("select count(*)::int n from openings where user_id <> auth.uid()")).at(0).n, 0);
await fails("insert into user_cards (user_id, card_id, set_id, quantity) values ($1, 'sv01-999', 'sv01', 99)", [A], /row-level security|permission denied/);
// Sans policy d'écriture, l'UPDATE ne touche aucune ligne (pas d'erreur, mais aucun effet)
await q("update wallet set coins = 999999");
await q("update profiles set bonus_boosters = 999");
await fails("select commit_opening($1, 'sv01', '[]'::jsonb, 0, 600, 15)", [A], /permission denied/);
await fails("select sell_cards($1, '[]'::jsonb)", [A], /permission denied/);
assert.equal((await q("select count(*)::int n from tcg_cache")).at(0).n, 0); // RLS sans policy : rien de visible
await fails("delete from profiles", [], /row-level security|permission denied/).catch(async () => {
  assert.equal((await q("select count(*)::int n from profiles")).at(0).n, 2); // delete silencieusement filtré par RLS
});
await fails("select send_friend_request($1, $2, 200)", [A, B], /permission denied/);
await fails("select leaderboard_rows()", [], /permission denied/);
await db.exec("reset role;");
assert.equal((await q("select coins from wallet where user_id=$1", [A]))[0].coins, 115);
assert.equal((await q("select max(bonus_boosters)::int m from profiles"))[0].m, 0);
console.log("✓ sécurité : lecture limitée par RLS, aucune écriture ni fonction de jeu côté client");

console.log("SQL SUPABASE : TOUS LES TESTS PASSENT");
