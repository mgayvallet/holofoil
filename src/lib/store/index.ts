import "server-only";
import { isSupabaseMode } from "@/lib/config";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export function store(): Store {
  return isSupabaseMode() ? supabaseStore : localStore;
}

export * from "./types";
