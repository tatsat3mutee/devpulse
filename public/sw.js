// DevPulse offline reading.
// Pages are network-first so readers always get today's edition; the caches only serve offline reads.
// Install (and every new edition) saves the latest edition, Pulse, the offline page and their assets,
// so an installed app works offline even before the reader has opened anything.
const VERSION = "v4";
const PAGES = `devpulse-pages-${VERSION}`;
const ASSETS = `devpulse-assets-${VERSION}`;
const IMAGES = `devpulse-images-${VERSION}`;
const LIMITS = { [PAGES]: 60, [ASSETS]: 80, [IMAGES]: 120 };
const OFFLINE = "/offline/";
const LIVE = ["/latest.json", "/json", "/release-sha.txt", "/sw.js"];

const bucketFor = (url) => url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/pagefind/") || /\.(css|js|woff2?|webmanifest)$/.test(url.pathname) ? ASSETS
  : /\.(png|jpe?g|webp|avif|gif|svg|ico)$/.test(url.pathname) ? IMAGES
  : PAGES;

async function trim(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - LIMITS[name])).map((key) => cache.delete(key)));
}

async function store(path, response) {
  if (!response.ok || response.type === "opaque") return;
  const url = new URL(path, self.location.origin);
  const cache = await caches.open(bucketFor(url));
  await cache.put(url.pathname + url.search, response.clone());
  // Directory-style pages answer at both /pulse and /pulse/.
  if (bucketFor(url) === PAGES && url.pathname !== "/") {
    const twin = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : `${url.pathname}/`;
    await cache.put(twin, response.clone());
  }
}

async function fetchAndStore(path) {
  try {
    const response = await fetch(path, { cache: "no-cache" });
    await store(path, response.clone());
    return response;
  } catch {
    return undefined;
  }
}

/** Saves the latest edition page, its cover images and the assets its HTML references. */
async function saveLatestEdition() {
  const digest = await fetch("/json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null);
  const pages = ["/", "/pulse/", OFFLINE, ...(digest ? [`/edition/${digest.date}/`] : [])];
  const responses = await Promise.all(pages.map(fetchAndStore));
  const html = await Promise.all(responses.filter(Boolean).map((response) => response.clone().text().catch(() => "")));
  const assets = new Set(["/manifest.webmanifest", "/mark.svg", "/icon-192.png"]);
  for (const text of html) for (const match of text.matchAll(/(?:href|src)="(\/_astro\/[^"]+)"/g)) assets.add(match[1]);
  for (const item of digest?.items ?? []) if (item.image) assets.add(item.image);
  await Promise.all([...assets].map(fetchAndStore));
  await Promise.all([PAGES, ASSETS, IMAGES].map(trim));
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveLatestEdition().finally(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = new Set([PAGES, ASSETS, IMAGES]);
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("devpulse-") && !keep.has(key)).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// The page tells us when /latest.json reports an edition newer than the one it rendered.
self.addEventListener("message", (event) => {
  if (event.data?.type === "save-latest") event.waitUntil(saveLatestEdition());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (LIVE.includes(url.pathname) || url.pathname.endsWith(".xml")) return;
  const bucket = bucketFor(url);

  // Hashed assets and images never change at a given URL: serve from cache first.
  if (bucket !== PAGES && (url.pathname.startsWith("/_astro/") || bucket === IMAGES)) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request).then(async (response) => {
      await store(url.pathname + url.search, response.clone());
      event.waitUntil(trim(bucket));
      return response;
    })));
    return;
  }

  const network = fetch(request);
  event.waitUntil(network.then(async (response) => {
    await store(url.pathname + url.search, response.clone());
    if (response.redirected && new URL(response.url).origin === self.location.origin) await store(new URL(response.url).pathname, response.clone());
    await trim(bucket);
  }).catch(() => {}));
  event.respondWith(network.catch(async () => {
    const cached = await caches.match(request, { ignoreSearch: bucket === PAGES });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match(OFFLINE);
      if (offline) return offline;
    }
    return new Response("This page is not saved for offline reading.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
