"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentProfile, localUserId } from "@/lib/auth";
import { createSessionToken, legacyClaimAllowed, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { burnTime, hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { localAccounts } from "@/lib/store/local";
import { ensureDemoAccount } from "@/lib/demo-account";
import { isSupabaseMode } from "@/lib/config";
import { buyBooster, evaluateAchievements, openBooster, sellDuplicates, type OpeningResult } from "@/lib/game/service";
import { GameError, store } from "@/lib/store";
import { supabaseServer } from "@/lib/supabase/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof GameError) return { ok: false, error: e.message, code: e.code };
    console.error(e);
    return { ok: false, error: "Oups, une erreur est survenue. Réessaie." };
  }
}

async function me() {
  const p = await getCurrentProfile();
  if (!p) throw new GameError("NOT_FOUND", "Connecte-toi pour jouer");
  return p;
}

// ---------- Boosters ----------

export async function openBoosterAction(categoryId: string): Promise<ActionResult<OpeningResult>> {
  return run(async () => {
    const res = await openBooster(await me(), String(categoryId));
    revalidatePath("/", "layout");
    return res;
  });
}

export async function buyBoosterAction() {
  return run(async () => {
    const res = await buyBooster((await me()).id);
    revalidatePath("/", "layout");
    return res;
  });
}

// ---------- Économie ----------

export async function sellAction(items: { cardId: string; quantity: number }[] | "all") {
  return run(async () => {
    const clean = items === "all" ? "all" : items.map((i) => ({ cardId: String(i.cardId), quantity: Number(i.quantity) }));
    const res = await sellDuplicates((await me()).id, clean);
    revalidatePath("/", "layout");
    return res;
  });
}

// ---------- Échanges ----------

export async function proposeTradeAction(toUser: string, offerCardId: string, requestCardId: string) {
  return run(async () => {
    const t = await store().createTrade((await me()).id, playerId(toUser), String(offerCardId), String(requestCardId));
    revalidatePath("/echanges");
    return t;
  });
}

export async function respondTradeAction(tradeId: string, accept: boolean) {
  return run(async () => {
    const p = await me();
    const t = await store().respondTrade(String(tradeId), p.id, Boolean(accept));
    let newAchievements: Awaited<ReturnType<typeof evaluateAchievements>> = [];
    if (t.status === "accepted") {
      newAchievements = await evaluateAchievements(p.id);
      await evaluateAchievements(t.fromUser);
    }
    revalidatePath("/", "layout");
    return { trade: t, newAchievements };
  });
}

export async function cancelTradeAction(tradeId: string) {
  return run(async () => {
    const t = await store().cancelTrade(String(tradeId), (await me()).id);
    revalidatePath("/echanges");
    return t;
  });
}

// ---------- Compte ----------

export interface AuthState {
  error?: string;
}

const USERNAME_RE = /^[\p{L}\p{N}_ -]{3,20}$/u;

/**
 * Connexion / création de compte par pseudo + mot de passe, dans les deux modes :
 * - local : mot de passe haché (scrypt) dans .data, session signée
 * - Supabase : Supabase Auth, avec un e-mail technique dérivé du pseudo (jamais affiché)
 * Limite de tentatives et message d'erreur identique que le pseudo existe ou non.
 */
export async function accountAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get("mode") === "register" ? "register" : "login";
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_RE.test(username)) return { error: "Pseudo : 3 à 20 caractères (lettres, chiffres, espace, - ou _)." };
  if (password.length < 8 || password.length > 128) return { error: "Mot de passe : 8 caractères minimum." };
  const uid = localUserId(username);
  if (uid === "local-") return { error: "Pseudo invalide." };

  // Limite : 8 tentatives / 15 min par pseudo et 30 par adresse IP
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const perUser = rateLimit(`auth:u:${uid}`, 8, 15 * 60_000);
  const perIp = rateLimit(`auth:ip:${ip}`, 30, 15 * 60_000);
  if (!perUser.ok || !perIp.ok) {
    return { error: `Trop de tentatives. Réessaie dans ${Math.max(perUser.retryInMin, perIp.retryInMin)} min.` };
  }

  if (mode === "register" && password !== String(formData.get("confirm") ?? "")) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  if (isSupabaseMode()) {
    const res = await supabaseAccount(mode, username, password);
    if (res.error) return res;
    resetRateLimit(`auth:u:${uid}`);
    redirect("/");
  }

  await ensureDemoAccount();
  if (mode === "register") {
    const res = await localAccounts.register(uid, username, await hashPassword(password), false);
    if (res === "taken") return { error: "Ce pseudo est déjà pris." };
  } else {
    const hash = await localAccounts.getHash(uid);
    if (hash === null && legacyClaimAllowed()) {
      // Ancien compte de démo sans mot de passe (développement) : le 1er mot de passe le protège
      await localAccounts.register(uid, username, await hashPassword(password), true);
    } else if (!hash) {
      await burnTime(password);
      return { error: "Pseudo ou mot de passe incorrect." };
    } else if (!(await verifyPassword(password, hash))) {
      return { error: "Pseudo ou mot de passe incorrect." };
    }
  }

  resetRateLimit(`auth:u:${uid}`);
  const name = (await localAccounts.getUsername(uid)) ?? username;
  (await cookies()).set(SESSION_COOKIE, await createSessionToken({ uid, name }), sessionCookieOptions);
  redirect("/");
}

/** E-mail technique d'un pseudo (domaine réservé .invalid : aucun e-mail n'est jamais envoyé) */
function pseudoEmail(username: string) {
  const domain = process.env.PSEUDO_EMAIL_DOMAIN || "joueurs.holofoil.invalid";
  return `${localUserId(username).slice("local-".length)}@${domain}`;
}

async function supabaseAccount(mode: "login" | "register", username: string, password: string): Promise<AuthState> {
  const supabase = await supabaseServer();
  const email = pseudoEmail(username);
  if (mode === "register") {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return { error: "Ce pseudo est déjà pris." };
      if (/email/i.test(error.message) && /invalid/i.test(error.message)) {
        console.error("[auth] Supabase refuse le domaine de l'e-mail technique :", error.message);
        return { error: "Configuration : Supabase refuse l'e-mail technique, définis PSEUDO_EMAIL_DOMAIN (voir DEPLOIEMENT.md)." };
      }
      if (/password/i.test(error.message)) return { error: "Mot de passe trop faible, choisis-en un plus long." };
      console.error("[auth] inscription Supabase :", error.message);
      return { error: "Inscription impossible pour le moment. Réessaie." };
    }
    // Sans session : la confirmation d'e-mail est activée dans Supabase (à désactiver, voir le guide)
    if (!data.session) return { error: "Compte créé, mais Supabase demande une confirmation d'e-mail : désactive-la (voir DEPLOIEMENT.md)." };
    return {};
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Pseudo ou mot de passe incorrect." };
  return {};
}

export async function logoutAction() {
  if (isSupabaseMode()) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  } else {
    (await cookies()).delete(SESSION_COOKIE);
  }
  redirect("/connexion");
}

// ---------- Amis ----------

/** Les ids viennent du client : format strict (uuid Supabase ou "local-…") */
function playerId(raw: unknown): string {
  const id = String(raw ?? "");
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) throw new GameError("NOT_FOUND", "Joueur introuvable");
  return id;
}

export async function sendFriendRequestAction(userId: string) {
  return run(async () => {
    const res = await store().sendFriendRequest((await me()).id, playerId(userId));
    revalidatePath("/amis");
    return res;
  });
}

export async function respondFriendAction(userId: string, accept: boolean) {
  return run(async () => {
    await store().respondFriendRequest((await me()).id, playerId(userId), Boolean(accept));
    revalidatePath("/", "layout");
  });
}

export async function removeFriendAction(userId: string) {
  return run(async () => {
    await store().removeFriend((await me()).id, playerId(userId));
    revalidatePath("/", "layout");
  });
}
