import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Sessions du mode local (sans Supabase) : cookie signé HMAC-SHA256, httpOnly.
 * Le contenu ne peut pas être modifié côté client sans invalider la signature.
 */

export const SESSION_COOKIE = "hf_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export interface SessionData {
  /** Id interne du joueur ("local-pseudo") */
  uid: string;
  name: string;
  avatar?: string | null;
  /** Expiration (secondes epoch) */
  exp: number;
}

let secretPromise: Promise<string> | null = null;

/** Secret de signature : SESSION_SECRET obligatoire en production, auto-généré en dev */
function getSecret(): Promise<string> {
  secretPromise ??= (async () => {
    const env = process.env.SESSION_SECRET;
    if (env && env.length >= 32) return env;
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET (32 caractères minimum) est obligatoire en production");
    }
    const dir = process.env.HOLOFOIL_DATA_DIR ?? path.join(process.cwd(), ".data");
    const file = path.join(dir, "session-secret");
    try {
      return (await fs.readFile(file, "utf8")).trim();
    } catch {
      const secret = randomBytes(48).toString("base64url");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, secret, { mode: 0o600 });
      return secret;
    }
  })();
  return secretPromise;
}

async function sign(payload: string) {
  return createHmac("sha256", await getSecret()).update(payload).digest("base64url");
}

/** Signe une valeur arbitraire */
export async function seal(data: unknown): Promise<string> {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${await sign(payload)}`;
}

/** Vérifie la signature (comparaison à temps constant) et renvoie la valeur, ou null */
export async function unseal<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(await sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function createSessionToken(data: Omit<SessionData, "exp">) {
  return seal({ ...data, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE } satisfies SessionData);
}

export async function readSessionToken(token: string | undefined): Promise<SessionData | null> {
  const s = await unseal<SessionData>(token);
  if (!s || typeof s.uid !== "string" || s.exp < Date.now() / 1000) return null;
  return s;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};


/** En développement, un ancien compte de démo (sans mot de passe) peut être protégé à la 1re connexion */
export function legacyClaimAllowed() {
  return process.env.NODE_ENV !== "production";
}

/** Id interne d'un compte local (dérivé du pseudo, insensible à la casse et aux accents) */
export function localUserId(username: string) {
  return "local-" + username.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}
