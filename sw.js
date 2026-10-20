/* Munshi service worker: offline cache + notification buttons. No server, no API. */
var CACHE = 'munshi-v10';
var FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './growmypin-ad.jpg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Network first (so updates reach you), cache fallback (so it works offline).
   Video uses range requests (206) - those go straight to the network and are not cached. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.headers.get('range')) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});

/* "Ho gaya" / "10 min baad" buttons on the notification */
self.addEventListener('notificationclick', function (e) {
  var act = e.action || 'open';
  var id = (e.notification.data && e.notification.data.id) || '';
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      if (list.length) {
        list[0].postMessage({ type: 'notif', action: act, id: id });
        if ('focus' in list[0]) return list[0].focus();
        return;
      }
      return self.clients.openWindow('./?act=' + encodeURIComponent(act) + '&id=' + encodeURIComponent(id));
    })
  );
});
