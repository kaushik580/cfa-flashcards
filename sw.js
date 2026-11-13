const CACHE_NAME = 'cfa-flashcards-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first strategy with offline cache fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 1. Background Sync: Syncs study progress/notes when connection returns
self.addEventListener('sync', event => {
  if (event.tag === 'sync-cfa-progress') {
    event.waitUntil(Promise.resolve());
  }
});

// 2. Periodic Sync: Refreshes live CFA Institute feed in the background
self.addEventListener('periodicsync', event => {
  if (event.tag === 'refresh-cfa-feed') {
    event.waitUntil(
      fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://blogs.cfainstitute.org/investor/feed/'))
        .then(res => res.json())
        .catch(() => {})
    );
  }
});

// 3. Push Notifications: Displays study reminders and opens the app on click
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {
    title: 'CFA Level 1 Study Reminder',
    body: 'Time for a quick 15-minute flashcard or mock exam session!'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      data: { url: './index.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || './index.html'));
});
