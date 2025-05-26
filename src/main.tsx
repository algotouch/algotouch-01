
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

// Check for potential React conflicts and useRef issues
const checkReactEnvironment = () => {
  if (typeof window !== 'undefined') {
    const issues = [];
    
    // Check for multiple React instances
    if ((window as any).React && (window as any).React !== React) {
      issues.push('Multiple React instances detected');
    }
    
    // Check React version consistency
    if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('main.tsx: React DevTools detected');
    }
    
    // Check for hook-related globals
    const reactInternals = Object.keys(window).filter(key => 
      key.includes('react') || key.includes('React') || key.includes('__REACT')
    );
    
    if (reactInternals.length > 0) {
      console.log('main.tsx: React-related globals:', reactInternals);
    }
    
    // Test basic React functionality
    try {
      React.createElement('div');
      React.useState;
      React.useEffect;
      React.useContext;
      React.useRef; // This is where the error might occur
      console.log('main.tsx: Basic React functions test passed');
    } catch (error) {
      issues.push(`React functions test failed: ${error.message}`);
    }
    
    if (issues.length > 0) {
      console.error('main.tsx: React environment issues detected:', issues);
      return false;
    } else {
      console.log('main.tsx: React environment check passed');
      return true;
    }
  }
  return true;
};

// Enhanced error handling for the entire application
const setupGlobalErrorHandlers = () => {
  // Handle unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('main.tsx: Unhandled Promise rejection:', event.reason);
    
    // Check if it's a React-related error
    if (event.reason && typeof event.reason === 'object') {
      const errorMessage = event.reason.message || String(event.reason);
      if (errorMessage.includes('useRef') || 
          errorMessage.includes('Invalid hook call') ||
          errorMessage.includes('useContext') ||
          errorMessage.includes('Cannot read properties of null')) {
        console.error('main.tsx: React Hook error in Promise:', {
          error: errorMessage,
          stack: event.reason.stack
        });
        
        // Attempt to recover by clearing potentially problematic data
        try {
          sessionStorage.removeItem('registration_data');
          console.log('main.tsx: Cleared potentially problematic session data');
        } catch (e) {
          console.warn('main.tsx: Could not clear session data:', e);
        }
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
    if (event.message && (
      event.message.includes('useRef') || 
      event.message.includes('Invalid hook call') ||
      event.message.includes('useContext') ||
      event.message.includes('Cannot read properties of null')
    )) {
      console.error('main.tsx: React Hook error detected:', {
        message: event.message,
        stack: event.error?.stack
      });
    }
  });
};

// Main initialization function with retry mechanism
const initializeApplication = async (retryCount = 0) => {
  const maxRetries = 3;
  
  try {
    console.log(`main.tsx: Initializing application (attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    console.log('main.tsx: Checking React environment...');
    const reactOk = checkReactEnvironment();
    
    if (!reactOk && retryCount < maxRetries) {
      console.warn(`main.tsx: React environment check failed, retrying in 1 second...`);
      setTimeout(() => initializeApplication(retryCount + 1), 1000);
      return;
    }
    
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
    
    if (retryCount < maxRetries) {
      console.log(`main.tsx: Retrying initialization in ${(retryCount + 1) * 2} seconds...`);
      setTimeout(() => initializeApplication(retryCount + 1), (retryCount + 1) * 2000);
      return;
    }
    
    // Fallback error display
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #dc2626; margin-bottom: 16px; text-align: center;">שגיאה באתחול האפליקציה</h1>
          <p style="color: #6b7280; margin-bottom: 24px; text-align: center;">אירעה שגיאה בעת טעינת האפליקציה. ייתכן שיש בעיה עם React או הסביבה.</p>
          <div style="margin-bottom: 24px;">
            <button onclick="location.reload()" style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">רענן דף</button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); location.reload()" style="background: #ef4444; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer;">נקה נתונים ורענן</button>
          </div>
          <details style="margin-top: 16px; max-width: 600px; width: 100%;">
            <summary style="cursor: pointer; color: #6b7280; text-align: center;">פרטי השגיאה</summary>
            <pre style="background: #f3f4f6; padding: 12px; border-radius: 4px; overflow: auto; margin-top: 8px; font-size: 12px; white-space: pre-wrap; direction: ltr;">${error instanceof Error ? error.stack : String(error)}</pre>
          </details>
          <p style="margin-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">גרסת React: ${React.version}</p>
        </div>
      `;
    }
  }
};

// Start the application
initializeApplication();
