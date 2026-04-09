// public/sw.js
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Workspace Dig", body: event.data.text() }; }

  const { title = "Workspace Dig", body = "", icon = "/icon-192.png", url = "/workspace" } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: "/icon-192.png",
      data: { url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/workspace";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
