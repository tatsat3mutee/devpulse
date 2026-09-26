// Network-first so readers always get today's edition; the cache only serves offline reads.
const CACHE = "devpulse-v3";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("devpulse-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (["/latest.json", "/json", "/release-sha.txt", "/sw.js"].includes(url.pathname) || url.pathname.endsWith(".xml")) return;
  const network = fetch(request);
  event.waitUntil(network.then(async (response) => {
    if (!response.ok) return;
    const copy = response.clone();
    const redirected = response.redirected && new URL(response.url).origin === self.location.origin ? response.clone() : undefined;
    const cache = await caches.open(CACHE);
    await cache.put(request, copy);
    if (redirected) await cache.put(response.url, redirected);
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, Math.max(0, keys.length - 128)).map((key) => cache.delete(key)));
  }).catch(() => {}));
  event.respondWith(
    network.catch(async () => (await caches.match(request)) ?? new Response("This page is not saved for offline reading.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })),
  );
});
