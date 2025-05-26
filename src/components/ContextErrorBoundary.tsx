
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Shield } from 'lucide-react';

interface ContextErrorBoundaryProps {
  children: ReactNode;
  contextName?: string;
  fallback?: ReactNode;
}

interface ContextErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  isContextError: boolean;
  isReactError: boolean;
}

export class ContextErrorBoundary extends Component<
  ContextErrorBoundaryProps,
  ContextErrorBoundaryState
> {
  constructor(props: ContextErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      isContextError: false,
      isReactError: false
    };
  }

  static getDerivedStateFromError(error: Error): ContextErrorBoundaryState {
    const errorMessage = error.message.toLowerCase();
    const isContextError = errorMessage.includes('usecontext') || 
                          errorMessage.includes('context') ||
                          errorMessage.includes('provider');
    const isReactError = errorMessage.includes('useref') || 
                        errorMessage.includes('invalid hook call') ||
                        errorMessage.includes('hooks can only be called') ||
                        errorMessage.includes('reactdispatcher');

    console.error('ContextErrorBoundary: Error detected:', {
      message: error.message,
      isContextError,
      isReactError,
      stack: error.stack
    });

    return { 
      hasError: true, 
      error,
      isContextError,
      isReactError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { contextName } = this.props;
    
    console.group('🔴 Context Error Boundary - Detailed Analysis');
    console.error('Context Name:', contextName || 'Unknown');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    
    // Check for specific React issues
    if (error.message.includes('useRef') || error.message.includes('Cannot read properties of null')) {
      console.error('🚨 React Hook Error - Potential Causes:');
      console.error('1. Multiple React instances loaded');
      console.error('2. React and React-DOM version mismatch');
      console.error('3. Hook called outside component');
      console.error('4. Component rendered before React initialization');
    }
    
    if (error.message.includes('useContext')) {
      console.error('🚨 Context Error - Potential Causes:');
      console.error('1. Component not wrapped in Provider');
      console.error('2. Incorrect Context import/export');
      console.error('3. Provider value is undefined');
      console.error('4. Component case sensitivity issue');
    }
    
    // Log environment info
    console.error('Environment Info:', {
      reactVersion: React.version,
      isDevelopment: process.env.NODE_ENV === 'development',
      userAgent: navigator.userAgent,
      currentUrl: window.location.href
    });
    
    console.groupEnd();
    
    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack,
      isContextError: error.message.toLowerCase().includes('context'),
      isReactError: error.message.toLowerCase().includes('useref') || 
                   error.message.toLowerCase().includes('hook')
    });
  }

  handleRetry = () => {
    console.log('ContextErrorBoundary: Attempting to recover from error');
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      isContextError: false,
      isReactError: false
    });
  };

  handleReload = () => {
    console.log('ContextErrorBoundary: Reloading page to recover from error');
    // Clear any cached data that might be causing issues
    try {
      sessionStorage.clear();
      localStorage.removeItem('auth_error');
      localStorage.removeItem('temp_registration_id');
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.reload();
  };

  handleGoHome = () => {
    console.log('ContextErrorBoundary: Navigating to home to recover from error');
    try {
      sessionStorage.clear();
      localStorage.removeItem('auth_error');
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { error, isContextError, isReactError } = this.state;
      const { contextName, fallback } = this.props;
      
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20">
          <Card className="max-w-2xl mx-auto border-red-200 dark:border-red-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-red-800 dark:text-red-200">
                  {isReactError ? 'שגיאת React Hook' : 
                   isContextError ? 'שגיאת Context' : 
                   'שגיאה באפליקציה'}
                </CardTitle>
              </div>
              <CardDescription className="text-red-700 dark:text-red-300">
                {isReactError && 'זוהתה בעיה עם React Hooks. ייתכן שיש קונפליקט בין גרסאות React.'}
                {isContextError && `שגיאה ב-Context ${contextName || ''}. הקומפוננטה אינה עטופה ב-Provider או שיש בעיה בייבוא.`}
                {!isReactError && !isContextError && 'אירעה שגיאה לא צפויה באפליקציה.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">פתרונות מוצעים:</h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {isReactError && (
                    <>
                      <li>• בדוק שיש גרסה אחת של React בפרויקט</li>
                      <li>• וודא שגרסאות React ו-React-DOM תואמות</li>
                      <li>• נקה cache ו-node_modules</li>
                    </>
                  )}
                  {isContextError && (
                    <>
                      <li>• וודא שהקומפוננטה עטופה ב-Provider</li>
                      <li>• בדוק את הייבוא/ייצוא של ה-Context</li>
                      <li>• וודא ש-Provider מעביר value תקין</li>
                    </>
                  )}
                  <li>• רענן את הדף לניסיון נוסף</li>
                  <li>• חזור לדף הבית</li>
                </ul>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <Shield className="h-4 w-4" />
                  נסה שוב
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  רענן דף
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  דף הבית
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4">
                  <summary className="text-sm font-medium cursor-pointer text-red-800 dark:text-red-200">
                    פרטי השגיאה (מצב פיתוח)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>הודעת שגיאה:</strong>
                      <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-20 mt-1">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-40 mt-1">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    <div>
                      <strong>גרסת React:</strong> {React.version}
                    </div>
                    <div>
                      <strong>Context:</strong> {contextName || 'Unknown'}
                    </div>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ContextErrorBoundary;
