/**
 * Application initialization and setup
 */

import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { ThemeProvider } from '@/contexts/theme';
import App from '../App';
import { 
  prefetchCriticalModules,
  setupModuleErrorHandlers,
  setupPeriodicUpdates
} from './serviceWorkerInit';

// Create a root element for React
let root: ReturnType<typeof createRoot> | null = null;

/**
 * Initialize the React application
 */
export function initializeApp(): void {
  // Use a try-catch to handle any React initialization errors
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found. Check the index.html file.");
    }

    // Create root once and render the app
    if (!root) {
      root = createRoot(rootElement);
    }

    // Render the app with all necessary providers
    root.render(
      <StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StrictMode>
    );
    
    // Prefetch critical modules
    prefetchCriticalModules();
    
    // Add global catch for uncaught module loading errors
    setupModuleErrorHandlers();

    // Setup periodic updates
    setupPeriodicUpdates();
  } catch (error) {
    console.error('Failed to initialize React application:', error);
    showFallbackUI();
  }
}

/**
 * Show fallback UI in case of critical errors
 */
function showFallbackUI(): void {
  // Create simple HTML elements instead of using a template string
  const errorDiv = document.createElement('div');
  errorDiv.style.textAlign = 'center';
  errorDiv.style.padding = '2rem';
  
  const errorTitle = document.createElement('h1');
  errorTitle.textContent = 'Application Error';
  errorDiv.appendChild(errorTitle);
  
  const errorMessage = document.createElement('p');
  errorMessage.textContent = 'Failed to initialize the application. Please try refreshing the page.';
  errorDiv.appendChild(errorMessage);
  
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh Now';
  refreshButton.onclick = () => window.location.reload();
  errorDiv.appendChild(refreshButton);
  
  // Clear and set the body content
  document.body.innerHTML = '';
  document.body.appendChild(errorDiv);
}
