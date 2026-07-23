// Bindi service worker — MVP
// Bu SW şu an sadece install/activate döngüsünü yönetiyor.
// Web Push (VAPID) gelecekte push handler'ı buraya eklenerek aktifleştirilecek.

const CACHE_NAME = 'bindi-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event handler (placeholder — VAPID subscription eklendiğinde çalışır)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Bindi', body: event.data?.text() ?? '' };
  }
  const title = data.title || 'Bindi';
  const body = data.body || '';
  const options = {
    body,
    icon: '/images/bindi-logo.jpg',
    badge: '/images/bindi-logo.jpg',
    data: { url: data.url || '/' },
    tag: data.tag || 'bindi-notif',
    renotify: !!data.renotify,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })(),
  );
});
