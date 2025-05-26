
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface SubscriptionErrorBoundaryProps {
  children: React.ReactNode;
}

interface SubscriptionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class SubscriptionErrorBoundary extends React.Component<
  SubscriptionErrorBoundaryProps,
  SubscriptionErrorBoundaryState
> {
  constructor(props: SubscriptionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SubscriptionErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SubscriptionErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      hasError: true,
      error,
      errorInfo: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    // Clear any corrupted data that might cause the error
    try {
      sessionStorage.removeItem('registration_data');
      localStorage.removeItem('temp_registration_id');
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    // Clear any corrupted data and redirect
    try {
      sessionStorage.removeItem('registration_data');
      localStorage.removeItem('temp_registration_id');
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>שגיאה בדף המנויים</CardTitle>
              </div>
              <CardDescription>
                אירעה שגיאה בטעינת דף המנויים. אנא נסה שוב.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                ייתכן שיש בעיה זמנית בטעינת הנתונים או בחיבור לשרת.
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
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  חזור לדף הבית
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-sm font-medium cursor-pointer">
                    פרטי השגיאה (מצב פיתוח)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.errorInfo && `\n\nComponent Stack:\n${this.state.errorInfo}`}
                  </pre>
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
