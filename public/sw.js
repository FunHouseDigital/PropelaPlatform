// NOTE: APP_VERSION must be bumped manually before each release.
// Since public/ files are copied verbatim by Vite, the `define` injection in
// vite.config.js does not apply here. Update this value as part of your
// release checklist to ensure caches are invalidated on new deployments.
const APP_VERSION = '1.0.0';
const SHELL_CACHE = `propela-shell-v${APP_VERSION}`;
const API_CACHE = `propela-api-v${APP_VERSION}`;
const ASSETS_CACHE = `propela-assets-v${APP_VERSION}`;
const FONT_CACHE = `propela-fonts-v${APP_VERSION}`;

const MAX_CACHE_ENTRIES = 50;
const API_TIMEOUT_MS = 5000;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Trim cache to max entries, evicting oldest first
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const deleteCount = keys.length - maxEntries;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Fetch with timeout helper
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
  });
}

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [SHELL_CACHE, API_CACHE, ASSETS_CACHE, FONT_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Message handler for SKIP_WAITING (supports update-available UI)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: strategy-based routing
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          if (request.url.startsWith('http')) {
            caches.open(SHELL_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // API calls: network-first with 5s timeout fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetchWithTimeout(request, API_TIMEOUT_MS)
        .then((response) => {
          const responseClone = response.clone();
          if (request.url.startsWith('http')) {
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
              trimCache(API_CACHE, MAX_CACHE_ENTRIES);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Fonts: stale-while-revalidate
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    request.url.match(/\.(woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            if (request.url.startsWith('http')) {
              caches.open(FONT_CACHE).then((cache) => {
                cache.put(request, responseClone);
                trimCache(FONT_CACHE, MAX_CACHE_ENTRIES);
              });
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Images: stale-while-revalidate
  if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            if (request.url.startsWith('http')) {
              caches.open(ASSETS_CACHE).then((cache) => {
                cache.put(request, responseClone);
                trimCache(ASSETS_CACHE, MAX_CACHE_ENTRIES);
              });
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Static assets (JS, CSS): cache-first with network fallback
  if (request.url.match(/\.(js|css)$/)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          if (request.url.startsWith('http')) {
            caches.open(ASSETS_CACHE).then((cache) => {
              cache.put(request, responseClone);
              trimCache(ASSETS_CACHE, MAX_CACHE_ENTRIES);
            });
          }
          return response;
        });
      })
    );
    return;
  }
});
