
/**
 * Main entry point for the application
 */

import './index.css';
import { initializeApp } from './lib/appInit';
import { initializeServiceWorker } from './lib/serviceWorkerInit';

// Cache buster timestamp for all dynamic imports
window.__VITE_TIMESTAMP__ = Date.now();

// Make sure the DOM is fully loaded before initializing React
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the service worker
  initializeServiceWorker();
  
  // Initialize the React application
  initializeApp();
});

// Add TypeScript declaration for window object
declare global {
  interface Window {
    __VITE_TIMESTAMP__: number;
  }
}
