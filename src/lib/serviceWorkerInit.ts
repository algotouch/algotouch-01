
/**
 * Service worker initialization and management module
 */

// Cache buster timestamp for all dynamic imports
const createTimestamp = () => Date.now();

/**
 * Register and initialize the service worker
 */
export const initializeServiceWorker = (): void => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return;
  }

  try {
    // First check if critical modules are available
    checkCriticalModules().then(modulesAvailable => {
      if (!modulesAvailable) {
        console.warn('Critical modules health check failed, clearing caches');
        // Clear all caches if modules aren't available
        if ('caches' in window) {
          caches.keys().then(cacheKeys => {
            return Promise.all(
              cacheKeys.map(key => caches.delete(key))
            );
          });
        }
      }
      
      // Try to unregister any existing service workers first to prevent conflicts
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
          console.log('Unregistered previous service worker');
        }
        
        // Register fresh service worker with relative path
        navigator.serviceWorker.register('./service-worker.js', {
          scope: './',
          updateViaCache: 'none' // Never use cache for the service worker itself
        }).then(registration => {
          console.log('ServiceWorker registered with scope:', registration.scope);
          
          // Force update if needed
          if (registration.waiting) {
            console.log('New service worker waiting to activate');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Listen for new service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker installed and ready');
                  // Force activation
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        }).catch(error => {
          console.error('ServiceWorker registration failed:', error);
          setupDirectFailsafe();
        });
      });
    });
    
    // Handle controller changes (service worker updates)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('Service worker controller changed, reloading for latest version');
        window.location.reload();
      }
    });
  } catch (error) {
    console.error('Service worker setup failed:', error);
    setupDirectFailsafe();
  }
};

/**
 * Direct failsafe for module loading (without service worker)
 */
export function setupDirectFailsafe(): void {
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('Failed to fetch dynamically imported module') ||
      event.message.includes('Loading chunk') ||
      event.message.includes('Loading CSS chunk')
    )) {
      console.error('Module loading error detected:', event.message);
      
      // Clear cache by appending a timestamp to requested URLs
      window.__VITE_TIMESTAMP__ = createTimestamp();
      console.log('Setting cache buster timestamp:', window.__VITE_TIMESTAMP__);
      
      // Extract module URL to detect which module failed
      const moduleUrl = event.message.match(/https?:\/\/[^'\s]+\.js/)?.[0] || '';
      const isDashboardModule = moduleUrl.includes('Dashboard') || 
                               window.location.pathname.includes('/dashboard');
      const isAuthModule = moduleUrl.includes('Auth') || 
                          window.location.pathname.includes('/auth');
      
      // Handle specific module failures
      if (isDashboardModule || isAuthModule) {
        console.log('Critical module failed to load, redirecting to home page...');
        setTimeout(() => {
          window.location.href = `./?t=${window.__VITE_TIMESTAMP__}`;
        }, 1000);
      }
      else {
        // For other pages, just reload with cache buster
        setTimeout(() => {
          // Use relative paths consistently
          const path = window.location.pathname === '/' ? './' : '.' + window.location.pathname;
          window.location.href = `${path}?t=${window.__VITE_TIMESTAMP__}`;
        }, 1000);
      }
    }
  });
}

/**
 * Check for critical modules availability
 */
export const checkCriticalModules = async (): Promise<boolean> => {
  try {
    // List of critical module paths relative to base URL
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    const results = await Promise.all(
      criticalModules.map(async (module) => {
        try {
          const response = await fetch(module, { 
            method: 'HEAD',
            cache: 'no-cache'
          });
          return response.ok;
        } catch {
          return false;
        }
      })
    );
    
    return results.every(result => result === true);
  } catch (error) {
    console.error('Critical module health check failed:', error);
    return false;
  }
};

/**
 * Prefetch critical modules immediately
 */
export function prefetchCriticalModules(): void {
  try {
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    criticalModules.forEach(module => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'script';
      link.href = module + (window.__VITE_TIMESTAMP__ ? `?v=${window.__VITE_TIMESTAMP__}` : ''); // Add cache buster
      document.head.appendChild(link);
    });
    
    console.log('Prefetching critical modules');
  } catch (e) {
    console.warn('Failed to prefetch critical modules:', e);
  }
}

/**
 * Setup handlers for module loading errors
 */
export function setupModuleErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    if (event.message && (
      event.message.includes('Failed to fetch dynamically imported module') ||
      event.message.includes('Loading chunk') ||
      event.message.includes('Loading CSS chunk')
    )) {
      console.error('Module loading error detected:', event.message);
      
      // Attempt to recover via service worker if possible
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const moduleUrl = event.message.match(/https?:\/\/[^'\s]+\.js/)?.[0];
        if (moduleUrl) {
          console.log('Asking service worker to retry failed module:', moduleUrl);
          navigator.serviceWorker.controller.postMessage({
            type: 'RETRY_FAILED_MODULES',
            modules: [moduleUrl]
          });
          
          // Listen for success/failure
          navigator.serviceWorker.addEventListener('message', (msgEvent) => {
            if (msgEvent.data?.type === 'MODULE_PREFETCH_RESULT') {
              if (msgEvent.data.success) {
                console.log('Module recovery successful, reloading...');
                window.location.reload();
              }
            }
          });
        }
      }
    }
  });
}

/**
 * Check for updated resources periodically
 */
export function setupPeriodicUpdates(): void {
  setInterval(() => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_UPDATES'
      });
    }
  }, 60000); // Check every minute
}
