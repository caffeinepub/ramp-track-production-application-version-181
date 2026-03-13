// Service Worker for PWA with modern lifecycle control and network-first navigation
const APP_VERSION = 'v1.0.142';
const CACHE_NAME = 'ramptrack-cache-' + APP_VERSION;
const RUNTIME_CACHE = 'ramptrack-runtime-' + APP_VERSION;

// Files to cache on install - including critical splash and background images
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/RampTrackSplash.png',
  '/assets/HomescreenBackground.jpg',
  '/assets/SignInBackgroundLower.jpg',
  '/assets/AppThumbnail.png',
  '/assets/AgentLogin.png',
  '/assets/managementlogin.png',
  '/assets/Check_In_Icon-1.png',
  '/assets/Check_Out_Icon-1.png',
  '/assets/Report_Issue_Icon-1.png',
  '/assets/Check_In_Icon.png',
  '/assets/Check_Out_Icon.png',
  '/assets/Report_Issue_Icon.png',
];

// Install event - cache static assets and skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker version:', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.error('[SW] Failed to cache some assets:', error);
        // Try to cache assets individually to identify which ones fail
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.error(`[SW] Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      });
    }).then(() => {
      console.log('[SW] Installation complete, skipping waiting');
    })
  );
  // Force the waiting service worker to become the active service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker version:', APP_VERSION);
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      console.log('[SW] Found caches:', cacheNames);
      
      // Delete all old caches that don't match current version
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      
      console.log('[SW] Activation complete, claiming clients');
      // Take control of all pages immediately
      await self.clients.claim();
    })()
  );
});

// Fetch event - network-first for navigation, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API calls to Internet Computer (let them go through)
  if (url.pathname.includes('/api/') || 
      url.hostname.includes('.ic0.app') || 
      url.hostname.includes('.icp0.io') ||
      url.hostname.includes('.raw.icp0.io')) {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // CRITICAL: Never intercept /assets/* requests for JS/CSS bundles
  // This ensures build assets are served with correct MIME types
  if (url.pathname.startsWith('/assets/') && 
      (url.pathname.includes('.js') || 
       url.pathname.includes('.css') || 
       url.pathname.match(/index-[a-zA-Z0-9]+\.js/))) {
    console.log('[SW] Bypassing service worker for build asset:', url.pathname);
    return; // Let the browser fetch directly from server
  }

  // CRITICAL: Never intercept /src/* requests during development
  if (url.pathname.startsWith('/src/')) {
    console.log('[SW] Bypassing service worker for source file:', url.pathname);
    return; // Let the browser fetch directly from server
  }

  // NETWORK-FIRST STRATEGY for navigation requests (HTML pages)
  // Never serve stale index.html when online
  if (request.mode === 'navigate' || request.destination === 'document') {
    console.log('[SW] Network-first strategy for navigation:', url.pathname);
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          console.log('[SW] Navigation fetch succeeded:', url.pathname);
          // Cache successful navigation responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.log('[SW] Navigation fetch failed, falling back to cache:', url.pathname, error.message);
          // Network failed (offline), try cache as fallback
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving cached navigation:', url.pathname);
              return cachedResponse;
            }
            // Fallback to Ramp Track branded offline page
            return caches.match('/index.html').then((indexResponse) => {
              if (indexResponse) {
                console.log('[SW] Serving cached index.html as fallback');
                return indexResponse;
              }
              // Last resort: return a simple Ramp Track offline message
              console.log('[SW] Serving inline offline page');
              return new Response(
                `<!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Ramp Track - Offline</title>
                  <style>
                    body {
                      margin: 0;
                      padding: 0;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
                      color: white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      text-align: center;
                    }
                    .container {
                      padding: 2rem;
                      max-width: 500px;
                    }
                    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
                    p { font-size: 1.2rem; opacity: 0.9; margin-bottom: 2rem; }
                    button {
                      background: white;
                      color: #1e3a8a;
                      border: none;
                      padding: 1rem 2rem;
                      font-size: 1rem;
                      font-weight: 600;
                      border-radius: 0.5rem;
                      cursor: pointer;
                    }
                    button:hover { opacity: 0.9; }
                    .footer { margin-top: 3rem; font-size: 0.875rem; opacity: 0.7; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Ramp Track</h1>
                    <p>You're currently offline. Please check your internet connection and try again.</p>
                    <button onclick="window.location.reload()">Retry</button>
                    <div class="footer">© Ramp Track Systems & Jayson James</div>
                  </div>
                </body>
                </html>`,
                {
                  headers: { 'Content-Type': 'text/html' },
                }
              );
            });
          });
        })
    );
    return;
  }

  // CACHE-FIRST STRATEGY for static assets (JS, CSS, images, fonts)
  // Matches /index-*.js, /assets/*, /styles/*
  if (url.pathname.match(/index-[a-zA-Z0-9]+\.js/) || 
      url.pathname.startsWith('/assets/') || 
      url.pathname.startsWith('/styles/') ||
      url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    console.log('[SW] Cache-first strategy for asset:', url.pathname);
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          // Return cached response and update cache in background for non-critical assets
          if (!url.pathname.includes('RampTrackSplash.png') && 
              !url.pathname.includes('HomescreenBackground.jpg') &&
              !url.pathname.includes('AppThumbnail.png')) {
            event.waitUntil(
              fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(request, networkResponse.clone());
                  });
                }
              }).catch(() => {
                // Network fetch failed, but we have cache
              })
            );
          }
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('[SW] Not in cache, fetching from network:', url.pathname);
        return fetch(request).then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((error) => {
          console.error('[SW] Fetch failed for:', url.pathname, error);
          // For images, return a placeholder or nothing
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // For all other requests, use default fetch
  console.log('[SW] Default fetch for:', url.pathname);
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message, skipping waiting');
    self.skipWaiting();
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Implement data sync logic here
    console.log('[SW] Syncing offline data...');
    // This would sync any queued actions from IndexedDB
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    return Promise.reject(error);
  }
}

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Ramp Track';
  const options = {
    body: data.body || 'New notification',
    icon: '/assets/AppThumbnail.png',
    badge: '/assets/AppThumbnail.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

console.log('[SW] Service worker loaded, version:', APP_VERSION);
