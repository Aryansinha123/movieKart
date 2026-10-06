// MovieKart PWA & Push Service Worker

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ─── Push Notification Event Handler ───────────────────
self.addEventListener("push", (event) => {
  let data = {
    title: "MovieKart 🎬",
    body: "A new release is available for your tracked title!",
    icon: "/icon.png",
    badge: "/icon.png",
    image: null,
    tag: "moviekart-release",
    data: { url: "/" },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || "/icon.png",
    badge: data.badge || "/icon.png",
    // Show movie poster as the large notification image (Android / Chrome)
    ...(data.image ? { image: data.image } : {}),
    vibrate: [200, 100, 200],
    tag: data.tag || "moviekart-release",
    // renotify: true makes Android re-buzz even when replacing the same tag
    renotify: true,
    requireInteraction: false,
    data: data.data || { url: "/" },
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// ─── Notification Click Handler ───────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";
  const fullTargetUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === fullTargetUrl && "focus" in client) {
            return client.focus();
          }
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(fullTargetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(fullTargetUrl);
        }
      })
  );
});
