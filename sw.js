/*
 * Rainsong offline worker (BUILD_PLAN B8.2). Registered by src/app/platform/offline.ts on the web
 * build only (the native apps carry every file). /precache.json (written at build) lists the shell
 * and per-scroll / per-Daily groups.
 * - install: cache the shell, so a cold start in airplane mode opens the game and plays the lessons.
 * - message {type:"warm", groups:[...]}: cache the current scroll, the next, today's Daily.
 * - fetch: pages and JSON manifests network-first (fresh when online, cached when not); every
 *   other same-origin file cache-first, and cached the first time it is fetched.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const SHELL = `rs-shell-${VERSION}`;
const FILES = "rs-files-v1";
const PAGES = "rs-pages-v1";

let precache = null;
async function manifest() {
  if (precache) return precache;
  const cached = await caches.match("/precache.json");
  try {
    const res = await fetch(`/precache.json?v=${VERSION}`, { cache: "no-store" });
    if (res.ok) {
      precache = await res.clone().json();
      await (await caches.open(SHELL)).put("/precache.json", res);
      return precache;
    }
  } catch (e) { /* offline */ }
  precache = cached ? await cached.json() : { shell: [], groups: {} };
  return precache;
}

/**
 * Put each URL into `cacheName`, a few at a time; one missing file never fails the rest. A file an
 * older version already holds is copied across instead of downloaded again (revalidated on use).
 */
async function fill(cacheName, urls) {
  const cache = await caches.open(cacheName);
  const todo = [];
  for (const u of urls) {
    if (await cache.match(u)) continue;
    const old = await caches.match(u);
    if (old) await cache.put(u, old); else todo.push(u);
  }
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const u = todo[i++];
      try {
        const res = await fetch(u, { cache: "no-cache" });
        if (res.ok && res.status === 200) await cache.put(u, res);
      } catch (e) { /* offline or gone: next time */ }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const m = await manifest();
    await fill(SHELL, m.shell);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith("rs-shell-") && name !== SHELL) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type !== "warm" || !Array.isArray(d.groups)) return;
  event.waitUntil((async () => {
    const m = await manifest();
    for (const g of d.groups) if (m.groups && m.groups[g]) await fill(FILES, m.groups[g]);
    if (event.source) event.source.postMessage({ type: "warmed", groups: d.groups });
  })());
});

const fresh = (path) => /\.json$/.test(path) || path === "/sw.js";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(PAGES)).put(url.pathname, res.clone());
        return res;
      } catch (e) {
        // Offline: this page as last seen, else the app shell (it routes /g/ letters and /d itself).
        return (await caches.match(url.pathname, { cacheName: PAGES })) || (await caches.match("/index.html")) || Response.error();
      }
    })());
    return;
  }
  if (fresh(url.pathname)) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(FILES)).put(url.pathname, res.clone());
        return res;
      } catch (e) {
        return (await caches.match(url.pathname)) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(url.pathname);
    if (hit) {
      // Art and audio keep their names when the asset lane replaces them: check once per worker
      // life, in the background (a 304 when unchanged). Hashed bundles never change.
      if (!/^\/assets\//.test(url.pathname) && !checked.has(url.pathname)) {
        checked.add(url.pathname);
        event.waitUntil(refresh(url.pathname));
      }
      return hit;
    }
    const res = await fetch(req);
    if (res.ok && res.status === 200) (await caches.open(FILES)).put(url.pathname, res.clone());
    return res;
  })());
});

const checked = new Set();
async function refresh(path) {
  try {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok || res.status !== 200) return;
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      if (await c.match(path)) await c.put(path, res.clone());
    }
  } catch (e) { /* offline */ }
}
