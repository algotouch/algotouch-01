
/**
 * React debugging utilities to help identify hook-related issues
 */

interface ReactDebugInfo {
  reactVersion: string;
  isDevelopment: boolean;
  hasDevTools: boolean;
  hookCallStack?: string[];
  potentialConflicts: string[];
}

/**
 * Get comprehensive React environment information
 */
export const getReactDebugInfo = (): ReactDebugInfo => {
  const info: ReactDebugInfo = {
    reactVersion: '18.3.1', // Fallback version
    isDevelopment: process.env.NODE_ENV === 'development',
    hasDevTools: false,
    potentialConflicts: []
  };

  if (typeof window !== 'undefined') {
    // Check for React DevTools
    info.hasDevTools = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    
    // Check for potential conflicts
    if ((window as any).React) {
      info.potentialConflicts.push('window.React exists (potential duplicate)');
    }
    
    // Check for multiple React scripts
    const reactScripts = document.querySelectorAll('script[src*="react"]');
    if (reactScripts.length > 1) {
      info.potentialConflicts.push(`Multiple React scripts found: ${reactScripts.length}`);
    }
    
    // Check for React in different global locations
    const globalChecks = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', '_reactInternalFiber', '_reactInternalInstance'];
    globalChecks.forEach(check => {
      if ((window as any)[check]) {
        info.potentialConflicts.push(`Global ${check} detected`);
      }
    });
  }

  return info;
};

/**
 * Log React hook errors with detailed context
 */
export const logReactHookError = (error: Error, component?: string) => {
  const debugInfo = getReactDebugInfo();
  
  console.group('🔴 React Hook Error Detected');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  
  if (component) {
    console.error('Component:', component);
  }
  
  console.table(debugInfo);
  
  // Specific checks for common hook errors
  if (error.message.includes('useRef')) {
    console.warn('💡 useRef Error Tips:');
    console.warn('- Ensure useRef is called at component top level');
    console.warn('- Check for duplicate React versions');
    console.warn('- Verify component is properly mounted');
  }
  
  if (error.message.includes('Invalid hook call')) {
    console.warn('💡 Invalid Hook Call Tips:');
    console.warn('- Hooks must be called inside function components');
    console.warn('- Check for conditional hook calls');
    console.warn('- Verify React and React-DOM versions match');
  }
  
  if (debugInfo.potentialConflicts.length > 0) {
    console.warn('⚠️ Potential React Conflicts:');
    debugInfo.potentialConflicts.forEach(conflict => console.warn(`- ${conflict}`));
  }
  
  console.groupEnd();
};

/**
 * Monitor React hook calls (development only)
 */
export const monitorReactHooks = () => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.log('🔍 React Hook Monitor initialized');
  
  // Override console.error to catch React hook errors
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    if (message.includes('useRef') || message.includes('Invalid hook call')) {
      logReactHookError(new Error(message));
    }
    
    originalError.apply(console, args);
  };
};

/**
 * Check if current environment has React hook issues
 */
export const checkReactHookHealth = (): boolean => {
  try {
    const debugInfo = getReactDebugInfo();
    
    // Return false if there are potential conflicts
    if (debugInfo.potentialConflicts.length > 0) {
      console.warn('React hook health check failed:', debugInfo.potentialConflicts);
      return false;
    }
    
    console.log('✅ React hook health check passed');
    return true;
  } catch (error) {
    console.error('❌ React hook health check error:', error);
    return false;
  }
};
