const CACHE = "hesabdari-static-v6";
const PRECACHE = ["/offline.html", "/manifest.json?v=3", "/joojo/pink-icon-192.png", "/joojo/pink-icon-180.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("hesabdari-") && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // HTML / Next navigations: network-first so auth & fresh UI work on iOS
  const isDocument =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isDocument) {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match("/offline.html")) || new Response("اتصال به اینترنت برقرار نیست", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
      )
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      })
    );
  }
});
