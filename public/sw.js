// Service worker Holofoil : rend l'app installable et met en cache les images de cartes.
const VERSION = "hf-v1";
const IMG_CACHE = `${VERSION}-cards`;
const STATIC_CACHE = `${VERSION}-static`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Images TCGdex : cache d'abord (elles ne changent jamais)
  if (url.hostname === "assets.tcgdex.net") {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok || res.type === "opaque") cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Assets Next versionnés : cache d'abord
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
  }
  // Pages et actions : toujours le réseau (données de jeu en temps réel)
});
