// Secret Jewel – Service Worker v2
// Versionsnummer hier erhöhen = sofortiges Update bei allen Kunden
const CACHE = 'secretjewel-v2';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap'
];

// Installation – sofort aktivieren, alten SW NICHT warten lassen
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting(); // ← Sofort übernehmen, kein Warten
    })
  );
});

// Aktivierung – alte Caches löschen, sofort alle Clients übernehmen
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // ← Sofort alle offenen Tabs übernehmen
    })
  );
});

// Fetch – Firebase/externe APIs immer live, Rest mit Cache-Fallback
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Firebase, EmailJS und externe APIs immer frisch laden
  if (url.includes('firestore') ||
      url.includes('firebase') ||
      url.includes('googleapis.com/google.firestore') ||
      url.includes('emailjs') ||
      url.includes('gstatic.com/firebasejs')) {
    return; // kein Cache, immer live
  }

  // Bilder: Cache-first (schneller Ladevorgang)
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

  // HTML/JS/CSS: Network-first → bei Offline Cache-Fallback
  e.respondWith(
    fetch(e.request).then(function(res) {
      if (res && res.status === 200 && e.request.method === 'GET') {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      }
      return res;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
