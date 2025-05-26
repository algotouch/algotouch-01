
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ReactErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ReactErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  errorStack?: string;
}

export class ReactErrorBoundary extends React.Component<
  ReactErrorBoundaryProps,
  ReactErrorBoundaryState
> {
  constructor(props: ReactErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ReactErrorBoundaryState {
    console.error('ReactErrorBoundary: Error caught:', error);
    return { 
      hasError: true, 
      error,
      errorStack: error.stack 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ReactErrorBoundary: Component error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
    
    // Log specific React hook errors
    if (error.message.includes('useRef') || error.message.includes('Invalid hook call')) {
      console.error('ReactErrorBoundary: React Hook Error Detected:', {
        message: error.message,
        isUseRefError: error.message.includes('useRef'),
        isInvalidHookCall: error.message.includes('Invalid hook call'),
        currentLocation: window.location.href,
        reactVersion: React.version
      });
    }
    
    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack,
      errorStack: error.stack
    });
  }

  handleRetry = () => {
    console.log('ReactErrorBoundary: Attempting to recover from error');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorStack: undefined });
  };

  handleReload = () => {
    console.log('ReactErrorBoundary: Reloading page to recover from error');
    window.location.reload();
  };

  handleGoHome = () => {
    console.log('ReactErrorBoundary: Navigating to home to recover from error');
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorStack } = this.state;
      const isReactHookError = error?.message.includes('useRef') || error?.message.includes('Invalid hook call');
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>
                  {isReactHookError ? 'שגיאת React Hook' : 'שגיאה באפליקציה'}
                </CardTitle>
              </div>
              <CardDescription>
                {isReactHookError 
                  ? 'זוהתה בעיה עם React Hooks. ייתכן שיש קונפליקט בין גרסאות React או שימוש לא נכון ב-Hooks.'
                  : 'אירעה שגיאה לא צפויה באפליקציה.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.props.fallbackMessage || 'אנא נסה אחת מהאפשרויות למטה לפתרון הבעיה.'}
              </p>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
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
                  חזור לדף הבית
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4">
                  <summary className="text-sm font-medium cursor-pointer">
                    פרטי השגיאה (מצב פיתוח)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>הודעת שגיאה:</strong>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                        {error.message}
                      </pre>
                    </div>
                    {errorStack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {errorStack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                          {this.state.errorInfo}
                        </pre>
                      </div>
                    )}
                    <div>
                      <strong>גרסת React:</strong> {React.version}
                    </div>
                    <div>
                      <strong>URL נוכחי:</strong> {window.location.href}
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
