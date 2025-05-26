
import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App';
import './index.css';

// Add comprehensive React environment debugging
console.log('main.tsx: Starting application initialization');
console.log('main.tsx: React environment:', {
  reactVersion: React.version,
  isDevelopment: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  nodeEnv: import.meta.env.NODE_ENV
});

// Check for potential React conflicts
const checkReactConflicts = () => {
  if (typeof window !== 'undefined') {
    const reactInstances = [];
    
    // Check for multiple React instances
    if ((window as any).React) {
      reactInstances.push('window.React');
    }
    
    // Check for React DevTools
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('main.tsx: React DevTools detected');
    }
    
    // Check for duplicate React in global scope
    const scripts = document.querySelectorAll('script[src*="react"]');
    if (scripts.length > 0) {
      console.log('main.tsx: Found React scripts in DOM:', scripts.length);
    }
    
    if (reactInstances.length > 0) {
      console.warn('main.tsx: Multiple React instances detected:', reactInstances);
    } else {
      console.log('main.tsx: No React conflicts detected');
    }
  }
};

// Enhanced error handling for the entire application
const setupGlobalErrorHandlers = () => {
  // Handle unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('main.tsx: Unhandled Promise rejection:', event.reason);
    
    // Check if it's a React-related error
    if (event.reason && typeof event.reason === 'object') {
      const errorMessage = event.reason.message || String(event.reason);
      if (errorMessage.includes('useRef') || errorMessage.includes('Invalid hook call')) {
        console.error('main.tsx: React Hook error in Promise:', {
          error: errorMessage,
          stack: event.reason.stack
        });
      }
    }
  });

  // Handle general JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('main.tsx: Global error caught:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    // Check if it's a React-related error
    if (event.message && (event.message.includes('useRef') || event.message.includes('Invalid hook call'))) {
      console.error('main.tsx: React Hook error detected:', {
        message: event.message,
        stack: event.error?.stack
      });
    }
  });
};

// Main initialization function
const initializeApplication = () => {
  try {
    console.log('main.tsx: Checking for React conflicts...');
    checkReactConflicts();
    
    console.log('main.tsx: Setting up global error handlers...');
    setupGlobalErrorHandlers();
    
    console.log('main.tsx: Looking for root element...');
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }
    
    console.log('main.tsx: Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('main.tsx: Rendering application...');
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    
    console.log('main.tsx: Application rendered successfully');
  } catch (error) {
    console.error('main.tsx: Failed to initialize application:', error);
    
    // Fallback error display
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
          <h1 style="color: #dc2626; margin-bottom: 16px;">שגיאה באתחול האפליקציה</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">אירעה שגיאה בעת טעינת האפליקציה</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">רענן דף</button>
          <details style="margin-top: 16px; max-width: 600px;">
            <summary style="cursor: pointer; color: #6b7280;">פרטי השגיאה</summary>
            <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow: auto; margin-top: 8px; font-size: 12px;">${error instanceof Error ? error.stack : String(error)}</pre>
          </details>
        </div>
      `;
    }
  }
};

// Start the application
initializeApplication();
