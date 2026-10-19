import "server-only";

/**
 * Limiteur de tentatives en mémoire (fenêtre glissante simple).
 * Suffisant pour un serveur unique ; derrière plusieurs instances, utiliser un stockage partagé.
 */
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryInMin: number } {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || cur.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryInMin: 0 };
  }
  cur.count++;
  return { ok: cur.count <= max, retryInMin: Math.ceil((cur.reset - now) / 60_000) };
}

export function resetRateLimit(key: string) {
  hits.delete(key);
}
