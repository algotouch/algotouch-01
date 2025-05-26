
/**
 * Module health check utility for monitoring and diagnosing module loading issues
 */

type ModuleStatus = {
  name: string;
  path: string;
  status: 'loaded' | 'failed' | 'pending';
  lastChecked: number;
  errorCount: number;
};

class ModuleHealthMonitor {
  private moduleStatus: Record<string, ModuleStatus> = {};
  private baseUrl: string = '';
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.baseUrl = window.location.origin;
    }
  }
  
  /**
   * Initialize health monitoring for critical modules
   */
  public initialize(): void {
    this.registerCriticalModules();
    this.startPeriodicCheck();
    this.monitorConsoleErrors();
  }
  
  /**
   * Register important modules for monitoring
   */
  private registerCriticalModules(): void {
    const criticalModules = [
      { name: 'main', path: './assets/index.js' },
      { name: 'react-vendor', path: './assets/vendor-react.js' },
      { name: 'ui-components', path: './assets/ui-components.js' },
      { name: 'dashboard', path: './assets/index.js' }, // Dashboard should be in main bundle
      { name: 'auth', path: './assets/index.js' }, // Auth should be in main bundle
    ];
    
    criticalModules.forEach(module => {
      this.moduleStatus[module.name] = {
        name: module.name,
        path: module.path,
        status: 'pending',
        lastChecked: 0,
        errorCount: 0
      };
    });
  }
  
  /**
   * Start periodic health checks
   */
  private startPeriodicCheck(): void {
    this.checkAllModules();
    
    // Check modules every 30 seconds
    setInterval(() => this.checkAllModules(), 30000);
  }
  
  /**
   * Check all registered modules
   */
  private async checkAllModules(): Promise<void> {
    console.log('Running module health check...');
    
    for (const moduleKey of Object.keys(this.moduleStatus)) {
      const module = this.moduleStatus[moduleKey];
      await this.checkModuleHealth(module);
    }
    
    // Log overall health status
    console.log('Module health check complete:', 
      Object.values(this.moduleStatus).map(m => `${m.name}: ${m.status}`));
  }
  
  /**
   * Check health of a single module
   */
  private async checkModuleHealth(module: ModuleStatus): Promise<void> {
    module.lastChecked = Date.now();
    
    try {
      const url = this.baseUrl + (module.path.startsWith('./') ? module.path.substring(1) : module.path);
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        module.status = 'loaded';
        module.errorCount = 0;
      } else {
        module.status = 'failed';
        module.errorCount++;
        console.error(`Module ${module.name} not available at ${module.path}, status: ${response.status}`);
      }
    } catch (error) {
      module.status = 'failed';
      module.errorCount++;
      console.error(`Error checking module ${module.name}:`, error);
    }
    
    // Take action if critical modules are failing
    if (module.status === 'failed' && module.errorCount > 2) {
      this.handleModuleFailure(module);
    }
  }
  
  /**
   * Handle a module failure
   */
  private handleModuleFailure(module: ModuleStatus): void {
    console.warn(`Critical module ${module.name} has failed ${module.errorCount} times`);
    
    // Try to recover via service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log(`Requesting service worker to refetch ${module.name}`);
      navigator.serviceWorker.controller.postMessage({
        type: 'RETRY_FAILED_MODULES',
        modules: [module.path]
      });
    }
    
    // If dashboard or auth module is consistently failing, redirect to home
    if ((module.name === 'dashboard' || module.name === 'auth') && module.errorCount > 3) {
      console.error(`${module.name} module persistently failing, redirecting to home`);
      
      // Add timestamp to bust cache
      const timestamp = Date.now();
      window.location.href = `./?t=${timestamp}`;
    }
  }
  
  /**
   * Monitor console for module loading errors
   */
  private monitorConsoleErrors(): void {
    if (typeof window !== 'undefined') {
      const originalError = console.error;
      
      console.error = (...args: any[]) => {
        // Call original error first
        originalError.apply(console, args);
        
        // Check if it's a module loading error
        const errorMessage = args.join(' ');
        if (errorMessage.includes('Failed to fetch dynamically imported module')) {
          // Extract module URL
          const urlMatch = errorMessage.match(/https?:\/\/[^'\s]+\.js/);
          if (urlMatch) {
            const moduleUrl = urlMatch[0];
            
            // Find corresponding module
            const moduleEntry = Object.values(this.moduleStatus).find(m => {
              const modulePath = m.path.startsWith('./') ? m.path.substring(1) : m.path;
              return moduleUrl.includes(modulePath);
            });
            
            if (moduleEntry) {
              moduleEntry.status = 'failed';
              moduleEntry.errorCount++;
              this.handleModuleFailure(moduleEntry);
            } else {
              // Unknown module - add to monitoring
              const name = 'unknown-' + moduleUrl.split('/').pop()?.split('.')[0];
              this.moduleStatus[name] = {
                name,
                path: moduleUrl,
                status: 'failed',
                lastChecked: Date.now(),
                errorCount: 1
              };
            }
          }
        }
      };
    }
  }
  
  /**
   * Get current module health status
   */
  public getModuleHealthStatus(): Record<string, ModuleStatus> {
    return { ...this.moduleStatus };
  }
}

// Export singleton instance
export const moduleHealthMonitor = new ModuleHealthMonitor();
