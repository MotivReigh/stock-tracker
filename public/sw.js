/**
 * Updraft service worker — handles Web Push events and opens the relevant
 * stock page on notification click.
 *
 * Registered by components/settings/push-setup.tsx via navigator.serviceWorker
 * .register("/sw.js"). The push payload is JSON we control on the server side
 * (see lib/alerts/push.ts > buildPushBody).
 */

self.addEventListener("install", (event) => {
  // Skip the waiting state so updates apply on next page load.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "Updraft alert", body: "", url: "/", tag: "updraft" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    console.warn("[sw] failed to parse push payload", err);
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: data.tag,
    data: { url: data.url },
    renotify: false,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      // Focus an existing window if one is on the same origin
      for (const c of clientsArr) {
        if ("focus" in c) {
          c.focus();
          if ("navigate" in c) c.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    }),
  );
});
