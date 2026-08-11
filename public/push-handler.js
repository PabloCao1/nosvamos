self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "NosVamos", body: event.data?.text() };
  }

  const title = data.title || "NosVamos";
  const appUrl = new URL("./", self.registration.scope);
  const options = {
    body: data.body || "Hay novedades en tu viaje.",
    icon: data.icon || new URL("icons/pwa-192x192.png", appUrl).href,
    badge: data.badge || new URL("icons/pwa-192x192.png", appUrl).href,
    tag: data.tag || "nosvamos-update",
    renotify: Boolean(data.renotify),
    data: { url: data.url || "notificaciones", notificationId: data.notificationId },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "notificaciones", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.startsWith(self.registration.scope));
      if (existing) {
        existing.navigate(destination);
        return existing.focus();
      }
      return self.clients.openWindow(destination);
    }),
  );
});
