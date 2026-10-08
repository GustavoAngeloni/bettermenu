// Service worker do Better Menu: recebe alertas (Web Push) mesmo com a tela bloqueada.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Better Menu", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Better Menu", {
      body: data.body || "",
      tag: data.tag,
      renotify: true,
      requireInteraction: true,
      icon: "/icon.svg",
      badge: "/icon.svg",
      vibrate: [300, 150, 300, 150, 300],
      data: { url: data.url || "/garcom" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/garcom";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
