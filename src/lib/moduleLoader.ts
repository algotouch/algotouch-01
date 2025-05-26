
/**
 * Simplified module loader utility with clean error handling
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

/**
 * Load a module with retry logic
 */
export const loadModuleWithRetry = async <T>(
  importFn: () => Promise<T>,
  moduleName: string
): Promise<T> => {
  let attempts = 0;
  
  const tryLoad = async (): Promise<T> => {
    try {
      console.log(`Attempting to load module: ${moduleName} (attempt ${attempts + 1}/${MAX_RETRIES})`);
      return await importFn();
    } catch (error) {
      attempts++;
      console.error(`Failed to load module: ${moduleName}`, error);
      
      if (attempts >= MAX_RETRIES) {
        console.error(`Failed to load ${moduleName} after ${MAX_RETRIES} attempts`);
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      
      // Add version parameter to bust cache
      if (typeof window !== 'undefined') {
        window.__VITE_TIMESTAMP__ = Date.now();
      }
      
      // Retry the import
      return tryLoad();
    }
  };
  
  return tryLoad();
};

// Health check function for critical modules
export const checkCriticalModules = async (): Promise<boolean> => {
  try {
    // List of critical module paths relative to base URL
    const criticalModules = [
      './assets/index.js',
      './assets/vendor-react.js',
      './assets/ui-components.js'
    ];
    
    const baseUrl = window.location.origin;
    const results = await Promise.all(
      criticalModules.map(async (module) => {
        try {
          const response = await fetch(`${baseUrl}/${module}`, { 
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

// Function to clear failed module records
export const clearFailedModuleRecords = () => {
  if (typeof window !== 'undefined' && 'sessionStorage' in window) {
    sessionStorage.removeItem('failedModules');
  }
};
