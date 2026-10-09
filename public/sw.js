const CACHE = "zina-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(OFFLINE_URL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith("/api/") || p.startsWith("/admin")) return;

  // Pages: always go to the network; show the offline page only if it fails.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets: cache-first (hashed build files, images, icons).
  if (p.startsWith("/_next/static/") || p.startsWith("/images/") || p.startsWith("/service-images/") || p.startsWith("/pwa-icon")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const url = data.url || "/admin/bookings";
  const title = data.title || "Zina Nails";
  const options = {
    body: data.body || "",
    icon: "/pwa-icon?size=192",
    badge: "/pwa-icon?size=192",
    dir: "rtl",
    lang: "ar",
    data: { url },
  };
  if (data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }

  event.waitUntil(
    (async () => {
      // Don't buzz if the person is already looking at that chat.
      if (url.indexOf("/chat") !== -1) {
        const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
        const path = url.split("?")[0];
        const watching = list.some((c) => {
          try {
            return c.visibilityState === "visible" && new URL(c.url).pathname.indexOf(path) === 0;
          } catch {
            return false;
          }
        });
        if (watching) return;
      }
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/bookings";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
