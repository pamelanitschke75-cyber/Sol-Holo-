const CACHE_VERSION = "sol-holo-116-notes-calendar-session";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names =>
        Promise.all(
          names.map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/*
  Absichtlich kein Fetch-Cache.

  Dadurch lädt Pam’s Holo index.html,
  das Holo-Bild und alle anderen Dateien
  direkt vom aktuellen Stand.
*/
