import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { ThemeProvider } from '@/contexts/theme';
import { AuthProvider } from '@/contexts/auth';
import { DirectionProvider } from '@/contexts/direction/DirectionProvider';
import { StockDataProvider } from '@/contexts/stock/StockDataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ReactErrorBoundary } from '@/components/ReactErrorBoundary';
import { Button } from '@/components/ui/button';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

// Add console logging to track React initialization
console.log('App.tsx: React version:', React.version);
console.log('App.tsx: Starting app initialization');

// Eagerly loaded routes for critical paths
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import IframeRedirect from '@/pages/IframeRedirect';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentFailed from '@/pages/PaymentFailed';
import NotFound from '@/pages/NotFound';
import AuthLoadError from '@/pages/AuthLoadError';

// Lazy loaded routes with error handling
const Subscription = lazy(() => {
  console.log('App.tsx: Loading Subscription component');
  return import('@/pages/Subscription').catch(error => {
    console.error('App.tsx: Failed to load Subscription component:', error);
    throw error;
  });
});

const Community = lazy(() => {
  console.log('App.tsx: Loading Community component');
  return import('@/pages/Community').catch(error => {
    console.error('App.tsx: Failed to load Community component:', error);
    throw error;
  });
});

const Courses = lazy(() => {
  console.log('App.tsx: Loading Courses component');
  return import('@/pages/Courses').catch(error => {
    console.error('App.tsx: Failed to load Courses component:', error);
    throw error;
  });
});

const CourseDetail = lazy(() => {
  console.log('App.tsx: Loading CourseDetail component');
  return import('@/pages/CourseDetail').catch(error => {
    console.error('App.tsx: Failed to load CourseDetail component:', error);
    throw error;
  });
});

const Account = lazy(() => {
  console.log('App.tsx: Loading Account component');
  return import('@/pages/Account').catch(error => {
    console.error('App.tsx: Failed to load Account component:', error);
    throw error;
  });
});

const MonthlyReport = lazy(() => {
  console.log('App.tsx: Loading MonthlyReport component');
  return import('@/pages/MonthlyReport').catch(error => {
    console.error('App.tsx: Failed to load MonthlyReport component:', error);
    throw error;
  });
});

const Calendar = lazy(() => {
  console.log('App.tsx: Loading Calendar component');
  return import('@/pages/Calendar').catch(error => {
    console.error('App.tsx: Failed to load Calendar component:', error);
    throw error;
  });
});

const TradeJournal = lazy(() => {
  console.log('App.tsx: Loading TradeJournal component');
  return import('@/pages/TradeJournal').catch(error => {
    console.error('App.tsx: Failed to load TradeJournal component:', error);
    throw error;
  });
});

const Journal = lazy(() => {
  console.log('App.tsx: Loading Journal component');
  return import('@/pages/Journal').catch(error => {
    console.error('App.tsx: Failed to load Journal component:', error);
    throw error;
  });
});

const Profile = lazy(() => {
  console.log('App.tsx: Loading Profile component');
  return import('@/pages/Profile').catch(error => {
    console.error('App.tsx: Failed to load Profile component:', error);
    throw error;
  });
});

const NewTrade = lazy(() => {
  console.log('App.tsx: Loading NewTrade component');
  return import('@/pages/NewTrade').catch(error => {
    console.error('App.tsx: Failed to load NewTrade component:', error);
    throw error;
  });
});

const Blog = lazy(() => {
  console.log('App.tsx: Loading Blog component');
  return import('@/pages/Blog').catch(error => {
    console.error('App.tsx: Failed to load Blog component:', error);
    throw error;
  });
});

const BlogPost = lazy(() => {
  console.log('App.tsx: Loading BlogPost component');
  return import('@/pages/BlogPost').catch(error => {
    console.error('App.tsx: Failed to load BlogPost component:', error);
    throw error;
  });
});

const AIAssistant = lazy(() => {
  console.log('App.tsx: Loading AIAssistant component');
  return import('@/pages/AIAssistant').catch(error => {
    console.error('App.tsx: Failed to load AIAssistant component:', error);
    throw error;
  });
});

const ContractDetails = lazy(() => {
  console.log('App.tsx: Loading ContractDetails component');
  return import('@/pages/ContractDetails').catch(error => {
    console.error('App.tsx: Failed to load ContractDetails component:', error);
    throw error;
  });
});

const MySubscriptionPage = lazy(() => {
  console.log('App.tsx: Loading MySubscriptionPage component');
  return import('@/pages/MySubscriptionPage').catch(error => {
    console.error('App.tsx: Failed to load MySubscriptionPage component:', error);
    throw error;
  });
});

// Simple loading component with better error feedback
const LoadingPage = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center space-y-4">
      <Spinner size="lg" />
      <p className="text-muted-foreground">טוען...</p>
    </div>
  </div>
);

// Enhanced error fallback component
const ErrorFallback = () => {
  const handleReload = () => {
    console.log('ErrorFallback: Reloading application');
    try {
      sessionStorage.removeItem('registration_data');
      localStorage.removeItem('temp_registration_id');
    } catch (e) {
      console.warn('ErrorFallback: Could not clear storage:', e);
    }
    window.location.reload();
  };

  const handleGoHome = () => {
    console.log('ErrorFallback: Navigating to home');
    try {
      sessionStorage.removeItem('registration_data');
      localStorage.removeItem('temp_registration_id');
    } catch (e) {
      console.warn('ErrorFallback: Could not clear storage:', e);
    }
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
        <div>
          <h1 className="text-2xl font-bold mb-2">שגיאה באפליקציה</h1>
          <p className="text-muted-foreground">
            אירעה שגיאה לא צפויה. אנא נסה שוב או חזור לדף הבית.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={handleReload} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            רענן דף
          </Button>
          <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            דף הבית
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          אם הבעיה נמשכת, אנא צור קשר עם התמיכה
        </p>
      </div>
    </div>
  );
};

function App() {
  console.log('App.tsx: Rendering App component');
  
  // Add React environment checks
  React.useEffect(() => {
    console.log('App.tsx: React environment check:', {
      reactVersion: React.version,
      isDevelopment: process.env.NODE_ENV === 'development',
      hasReactDevTools: typeof window !== 'undefined' && !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
  }, []);

  return (
    <ReactErrorBoundary fallbackMessage="שגיאת React זוהתה ברמת האפליקציה העליונה">
      <ErrorBoundary fallback={<ErrorFallback />}>
        <BrowserRouter>
          <ReactErrorBoundary fallbackMessage="שגיאה בטעינת ספקי הקונטקסט">
            <ThemeProvider>
              <DirectionProvider dir="rtl">
                <AuthProvider>
                  <StockDataProvider refreshInterval={30000}>
                    <ReactErrorBoundary fallbackMessage="שגיאה בטעינת המסלולים">
                      <Suspense fallback={<LoadingPage />}>
                        <Routes>
                          {/* Auth Error Route */}
                          <Route path="/auth-error" element={<AuthLoadError />} />
                          
                          {/* Public routes */}
                          <Route path="/auth" element={<Auth />} />
                          
                          {/* Payment routes */}
                          <Route path="/payment/redirect" element={<IframeRedirect />} />
                          <Route path="/payment/success" element={<PaymentSuccess />} />
                          <Route path="/payment/failed" element={<PaymentFailed />} />
                          
                          {/* Protected routes */}
                          <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/subscription" element={<Subscription />} />
                            <Route path="/community" element={<Community />} />
                            <Route path="/courses" element={<Courses />} />
                            <Route path="/courses/:courseId" element={<CourseDetail />} />
                            <Route path="/account" element={<Account />} />
                            <Route path="/monthly-report" element={<MonthlyReport />} />
                            <Route path="/calendar" element={<Calendar />} />
                            <Route path="/trade-journal" element={<TradeJournal />} />
                            <Route path="/journal" element={<Journal />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/new-trade" element={<NewTrade />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:id" element={<BlogPost />} />
                            <Route path="/ai-assistant" element={<AIAssistant />} />
                            <Route path="/contract/:contractId" element={<ContractDetails />} />
                            <Route path="/my-subscription" element={<MySubscriptionPage />} />
                          </Route>
                          
                          {/* Default & catch-all routes */}
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </ReactErrorBoundary>
                    <Toaster richColors position="top-center" dir="rtl" />
                  </StockDataProvider>
                </AuthProvider>
              </DirectionProvider>
            </ThemeProvider>
          </ReactErrorBoundary>
        </BrowserRouter>
      </ErrorBoundary>
    </ReactErrorBoundary>
  );
}

export default App;
