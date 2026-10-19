import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseMode } from "@/lib/config";
import { supabaseServer } from "@/lib/supabase/server";
import { store, type Profile } from "@/lib/store";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

export { localUserId } from "@/lib/session";

/** Profil de l'utilisateur connecté (créé à la première visite), ou null */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (isSupabaseMode()) {
    const supabase = await supabaseServer();
    // getUser() revalide le jeton auprès de Supabase (contrairement à getSession())
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const meta = user.user_metadata ?? {};
    const name = (meta.username ||
      meta.full_name ||
      meta.name ||
      user.email?.split("@")[0] ||
      "Dresseur") as string;
    return store().ensureProfile(user.id, name, (meta.avatar_url as string) ?? null);
  }

  // Mode local : session signée (compte pseudo + mot de passe)
  const session = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return store().ensureProfile(session.uid, session.name, session.avatar ?? null);
});

export async function requireProfile(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p) redirect("/connexion");
  return p;
}
