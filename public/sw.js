/* Cache only the offline screen and its assets—never video, API data or analytics. */
const CACHE = "zepvi-offline-v1"
const ASSETS = ["/offline.html", "/icons/icon-192.png", "/favicon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)))
  // Do not force activation/reload while a visitor is watching TV.
})

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("zepvi-offline-") && key !== CACHE)
      .map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()))
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || event.request.method !== "GET") return
  if (event.request.mode === "navigate") {
    // Keep real network status codes, including 404s; fallback only when offline.
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")))
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(event.request)))
  }
})
