import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/**
 * Client "service role" : contourne la RLS. Utilisé UNIQUEMENT côté serveur
 * pour les mutations de jeu (tirage, ventes, échanges) afin qu'aucun client
 * ne puisse écrire directement dans la base.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return admin;
}
