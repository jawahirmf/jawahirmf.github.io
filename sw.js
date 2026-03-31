// Secret Jewel – Service Worker
// Version: 1.0
const CACHE = 'secretjewel-v1';

// Dateien die offline verfügbar sein sollen
const PRECACHE = [
  './',
  './index_11.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap'
];

// Installation: Dateien cachen
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Aktivierung: Alten Cache löschen
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-first für statische Assets, Network-first für Firebase
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Firebase & externe APIs immer live laden
  if (url.includes('firestore') ||
      url.includes('firebase') ||
      url.includes('googleapis.com/google.firestore') ||
      url.includes('emailjs')) {
    return;
  }

  // Bilder: Cache-first
  if (e.request.destination === 'image') {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
          return res;
        }).catch(function() { return cached; });
      })
    );
    return;
  }

  // Alles andere: Network-first, Cache als Fallback
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
