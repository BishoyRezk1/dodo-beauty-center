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
    icon: "/favicon.ico",
    badge: "/favicon.ico",
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
