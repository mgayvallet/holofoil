import "server-only";
import { DEMO_ACCOUNT, isSupabaseMode } from "@/lib/config";
import { localAccounts } from "@/lib/store/local";
import { hashPassword, verifyPassword } from "@/lib/password";
import { localUserId } from "@/lib/session";

let ready: Promise<void> | null = null;

/**
 * Crée (ou répare) le compte de démo en développement. Appelé par la page de connexion
 * et l'action de connexion : fonctionne même si le serveur a été lancé sans `npm run dev`.
 */
export function ensureDemoAccount(): Promise<void> {
  if (isSupabaseMode() || process.env.NODE_ENV === "production") return Promise.resolve();
  ready ??= (async () => {
    const { username, password } = DEMO_ACCOUNT;
    const uid = localUserId(username);
    const hash = await localAccounts.getHash(uid);
    if (hash === undefined) {
      await localAccounts.register(uid, username, await hashPassword(password), false);
      await localAccounts.grant(uid, 2000, 10);
    } else if (!hash || !(await verifyPassword(password, hash))) {
      await localAccounts.setHash(uid, await hashPassword(password));
    }
  })().catch((e) => {
    ready = null; // on retentera au prochain appel
    throw e;
  });
  return ready;
}
