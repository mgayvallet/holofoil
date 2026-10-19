/**
 * Crée (ou remet à jour) le compte de démo du mode local. Lancé par `npm run dev` ; le serveur le crée
 * aussi tout seul en développement (page de connexion), voir src/lib/demo-account.ts.
 * Identifiants : DEMO_USERNAME / DEMO_PASSWORD, sinon ceux de src/lib/config.ts.
 */
import { DEMO_ACCOUNT, isSupabaseMode } from "../src/lib/config";
import { localAccounts } from "../src/lib/store/local";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { localUserId } from "../src/lib/session";

if (isSupabaseMode()) {
  console.log("[démo] mode Supabase : pas de compte de démo local");
  process.exit(0);
}

const { username, password } = DEMO_ACCOUNT;
const uid = localUserId(username);
const hash = await localAccounts.getHash(uid);

if (hash === undefined) {
  await localAccounts.register(uid, username, await hashPassword(password), false);
  await localAccounts.grant(uid, 2000, 10); // de quoi tester : 2 000 pièces + 10 boosters bonus
  console.log(`[démo] compte « ${username} » créé (10 boosters bonus, 2 000 pièces en plus)`);
} else if (!hash || !(await verifyPassword(password, hash))) {
  await localAccounts.setHash(uid, await hashPassword(password));
  console.log(`[démo] mot de passe du compte « ${username} » mis à jour`);
} else {
  console.log(`[démo] compte « ${username} » prêt`);
}
