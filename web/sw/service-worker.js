// Python Quest service worker. The build (vite.config.ts) prepends `const CONFIG = {...}` with:
//   build:   id of this build (changes whenever an emitted file name changes)
//   precache: app files of this build, relative to the worker's scope
//   pyodide: base URL of the Pyodide distribution
//
// Caches, all prefixed "pq-":
//   pq-app-<build>       this build's files (precached) and other same-origin files (fonts)
//   pq-pyodide-<base>    Pyodide and every package downloaded so far (versioned URLs, never change)
// The page itself is fetched from the network first, so a new deploy is picked up as soon as
// there is a connection; the cached copy is used only offline.

/* global CONFIG */
const APP_CACHE = `pq-app-${CONFIG.build}`;
const PYODIDE = new URL(CONFIG.pyodide, self.registration.scope).href;
const PY_CACHE = `pq-pyodide-${PYODIDE}`;
const SHELL = new URL("./", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await cache.addAll([SHELL, ...CONFIG.precache.map((f) => new URL(f, self.registration.scope).href)]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith("pq-") && key !== APP_CACHE && key !== PY_CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(SHELL, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(SHELL);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(cacheName, request, init) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  const response = await fetch(request.url, init);
  if (response.ok) await cache.put(request.url, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = request.url;
  if (request.mode === "navigate" && url.startsWith(self.registration.scope)) {
    event.respondWith(networkFirst(request));
  } else if (url.startsWith(PYODIDE)) {
    // pyodide.js arrives through importScripts (a no-cors request); asking for it with CORS
    // gives a readable response that can be stored and served to both kinds of request.
    event.respondWith(cacheFirst(PY_CACHE, request, { mode: "cors", credentials: "omit" }));
  } else if (url.startsWith(self.registration.scope) && !url.endsWith("/sw.js")) {
    event.respondWith(cacheFirst(APP_CACHE, request));
  }
});
