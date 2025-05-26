
// Enhanced service worker for caching and error recovery

// Cache name with version - increment this to force cache busting
const CACHE_NAME = 'algotouch-cache-v5';

// Critical files to cache - prioritize Auth and Dashboard components
const urlsToCache = [
  './',
  './index.html',
  './assets/index.css',
  './assets/index.js',
  './assets/vendor-react.js',
  './assets/ui-components.js',
  './assets/pages.js',
];

// Install the service worker and cache initial assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Force activation without waiting
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell and content');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // Take control immediately
  event.waitUntil(clients.claim());
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Preload critical assets after activation
  event.waitUntil(
    preloadCriticalAssets()
  );
});

// Network-first strategy for JavaScript modules
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip non-HTTP(S) requests and browser extensions
  if (!event.request.url.startsWith('http')) return;
  
  // Skip analytics and API endpoints
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/functions/')) return;
  
  // For JS module files, always use network-first with cache fallback
  if (event.request.url.endsWith('.js') || 
      event.request.url.includes('/assets/')) {
    
    // Add cache buster for JS files
    const url = new URL(event.request.url);
    const originalUrl = event.request.url;
    
    // Add timestamp if not already present
    if (!url.searchParams.has('v')) {
      url.searchParams.set('v', Date.now().toString());
    }
    
    const modifiedRequest = new Request(url.toString(), {
      method: event.request.method,
      headers: event.request.headers,
      mode: event.request.mode,
      credentials: event.request.credentials,
      redirect: event.request.redirect
    });
    
    event.respondWith(
      fetch(modifiedRequest)
        .then(response => {
          // Clone the response to save it in cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          console.log('Service Worker: Falling back to cache for:', originalUrl);
          // If network fetch fails, try to get from cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Special fallbacks for critical modules
            if (originalUrl.includes('index.js')) {
              return Response.redirect('./index.html');
            }
            
            if (originalUrl.includes('.js')) {
              return new Response(
                'console.warn("Module load failed; reloading app");' +
                'setTimeout(() => window.location.reload(), 1000);', 
                {headers: { 'Content-Type': 'application/javascript' }}
              );
            }
          });
        })
    );
    return;
  }
  
  // For HTML navigation requests, use cache-first for speed
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            return caches.match('./index.html');
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  
  // For all other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Return cached response
        }
        
        return fetch(event.request.clone())
          .then((response) => {
            if(!response || response.status !== 200) {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'RETRY_FAILED_MODULES') {
    console.log('Service Worker: Attempting to recover failed modules', event.data.modules);
    const moduleUrls = event.data.modules || [];
    
    // Invalidate cache for these modules
    caches.open(CACHE_NAME).then((cache) => {
      moduleUrls.forEach(url => {
        cache.delete(url).then(() => console.log('Cache invalidated for:', url));
      });
      
      // Fetch fresh copies
      Promise.all(
        moduleUrls.map(url => 
          fetch(url, { 
            cache: 'reload',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
          })
            .then(response => {
              if (response.ok) {
                cache.put(url, response);
                console.log('Module recovered successfully:', url);
                return true;
              }
              console.log('Module recovery failed:', url);
              return false;
            })
            .catch(() => {
              console.log('Module fetch failed completely:', url);
              return false;
            })
        )
      ).then(results => {
        if (event.source) {
          // Notify the client about the prefetch results
          event.source.postMessage({
            type: 'MODULE_PREFETCH_RESULT',
            success: results.some(r => r === true)
          });
        }
      });
    });
  }
  
  if (event.data && event.data.type === 'CHECK_UPDATES') {
    console.log('Checking for updates to cached resources');
    updateCachedResources();
  }
});

// Preload critical assets in background
async function preloadCriticalAssets() {
  const cache = await caches.open(CACHE_NAME);
  
  // Critical JavaScript chunks
  const criticalAssets = [
    './assets/index.js',
    './assets/vendor-react.js',
    './assets/ui-components.js',
    './assets/pages.js'
  ];
  
  return Promise.allSettled(
    criticalAssets.map(async (asset) => {
      try {
        const response = await fetch(asset, { 
          cache: 'reload',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          await cache.put(asset, response);
          console.log('Successfully preloaded:', asset);
        }
      } catch (err) {
        console.warn('Failed to preload asset:', asset, err);
      }
    })
  );
}

// Update cached resources when needed
async function updateCachedResources() {
  const cache = await caches.open(CACHE_NAME);
  
  // Get all cached URLs
  const cachedRequests = await cache.keys();
  const jsRequests = cachedRequests.filter(req => 
    req.url.endsWith('.js') || req.url.endsWith('.css'));
  
  // Update each JS/CSS resource
  return Promise.allSettled(
    jsRequests.map(async (request) => {
      try {
        const freshResponse = await fetch(request, { 
          cache: 'reload', 
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (freshResponse.ok) {
          await cache.put(request, freshResponse);
          console.log('Updated cached resource:', request.url);
        }
      } catch (err) {
        console.warn('Failed to update cached resource:', request.url, err);
      }
    })
  );
}
