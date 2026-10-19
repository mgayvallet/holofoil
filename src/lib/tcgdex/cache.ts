import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isSupabaseMode } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Cache serveur à deux niveaux pour les données TCGdex :
 *  1. mémoire du process (instantané)
 *  2. persistant : table `tcg_cache` (Supabase) ou fichiers `.data/cache` (mode local)
 * Les appels concurrents sur une même clé sont dédupliqués.
 */

interface Entry<T> {
  data: T;
  fetchedAt: number;
}

const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const CACHE_DIR = path.join(process.env.HOLOFOIL_DATA_DIR ?? path.join(process.cwd(), ".data"), "cache");

function fileFor(key: string) {
  return path.join(CACHE_DIR, key.replace(/[^a-z0-9._-]/gi, "_") + ".json");
}

async function readPersistent<T>(key: string): Promise<Entry<T> | null> {
  try {
    if (isSupabaseMode()) {
      const { data } = await supabaseAdmin()
        .from("tcg_cache")
        .select("data, fetched_at")
        .eq("key", key)
        .maybeSingle();
      if (!data) return null;
      return { data: data.data as T, fetchedAt: new Date(data.fetched_at).getTime() };
    }
    const raw = await fs.readFile(fileFor(key), "utf8");
    return JSON.parse(raw) as Entry<T>;
  } catch {
    return null;
  }
}

async function writePersistent<T>(key: string, entry: Entry<T>) {
  try {
    if (isSupabaseMode()) {
      await supabaseAdmin()
        .from("tcg_cache")
        .upsert({ key, data: entry.data, fetched_at: new Date(entry.fetchedAt).toISOString() });
      return;
    }
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(fileFor(key), JSON.stringify(entry));
  } catch (e) {
    console.warn("[cache] écriture impossible", key, e);
  }
}

export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const mem = memory.get(key) as Entry<T> | undefined;
  if (mem && now - mem.fetchedAt < ttlMs) return mem.data;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const job = (async () => {
    const stored = await readPersistent<T>(key);
    if (stored && now - stored.fetchedAt < ttlMs) {
      memory.set(key, stored);
      return stored.data;
    }
    try {
      const data = await loader();
      const entry = { data, fetchedAt: Date.now() };
      memory.set(key, entry);
      await writePersistent(key, entry);
      return data;
    } catch (e) {
      // API indisponible : on sert la version périmée plutôt que rien
      if (stored) {
        memory.set(key, stored);
        return stored.data;
      }
      throw e;
    }
  })().finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
}

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
