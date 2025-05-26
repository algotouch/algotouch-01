
/**
 * Service Worker Manager for handling registration and lifecycle
 */

export interface ServiceWorkerOptions {
  path: string;
  scope: string;
  updateViaCache?: 'none' | 'all' | 'imports';
  forceUpdate?: boolean;
}

const defaultOptions: ServiceWorkerOptions = {
  path: './service-worker.js',
  scope: './',
  updateViaCache: 'none',
  forceUpdate: true
};

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private options: ServiceWorkerOptions;
  private refreshing = false;

  constructor(options: Partial<ServiceWorkerOptions> = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Register or update the service worker
   */
  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser');
      return null;
    }

    try {
      // Unregister existing service workers if force update is enabled
      if (this.options.forceUpdate) {
        await this.unregisterAll();
      }

      // Register new service worker
      this.registration = await navigator.serviceWorker.register(
        this.options.path, 
        { 
          scope: this.options.scope,
          updateViaCache: this.options.updateViaCache
        }
      );

      console.log('Service worker registered with scope:', this.registration.scope);

      // Setup listeners for updates
      this.setupUpdateHandlers();

      return this.registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Unregister all service workers
   */
  public async unregisterAll(): Promise<void> {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered service worker');
      }
    } catch (error) {
      console.error('Error unregistering service workers:', error);
    }
  }

  /**
   * Setup handlers for service worker updates
   */
  private setupUpdateHandlers(): void {
    if (!this.registration) return;

    // Handle waiting service workers
    if (this.registration.waiting) {
      this.updateServiceWorker(this.registration.waiting);
    }

    // Listen for new service workers
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.updateServiceWorker(newWorker);
        }
      });
    });

    // Reload page when controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!this.refreshing) {
        this.refreshing = true;
        console.log('New service worker controlling the page, reloading...');
        window.location.reload();
      }
    });
  }

  /**
   * Update a service worker by sending the SKIP_WAITING message
   */
  private updateServiceWorker(worker: ServiceWorker): void {
    console.log('Updating service worker...');
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Send a message to the active service worker
   */
  public sendMessage(message: any): void {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();
