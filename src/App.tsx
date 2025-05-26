
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { ThemeProvider } from '@/contexts/theme';
import { AuthProvider } from '@/contexts/auth';
import { DirectionProvider } from '@/contexts/direction/DirectionProvider';
import { StockDataProvider } from '@/contexts/stock/StockDataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';

// Eagerly loaded routes for critical paths
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import IframeRedirect from '@/pages/IframeRedirect';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentFailed from '@/pages/PaymentFailed';
import NotFound from '@/pages/NotFound';
import AuthLoadError from '@/pages/AuthLoadError';

// Lazy loaded routes
const Subscription = lazy(() => import('@/pages/Subscription'));
const Community = lazy(() => import('@/pages/Community'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));
const Account = lazy(() => import('@/pages/Account'));
const MonthlyReport = lazy(() => import('@/pages/MonthlyReport'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const TradeJournal = lazy(() => import('@/pages/TradeJournal'));
const Journal = lazy(() => import('@/pages/Journal'));
const Profile = lazy(() => import('@/pages/Profile'));
const NewTrade = lazy(() => import('@/pages/NewTrade'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const AIAssistant = lazy(() => import('@/pages/AIAssistant'));
const ContractDetails = lazy(() => import('@/pages/ContractDetails'));
const MySubscriptionPage = lazy(() => import('@/pages/MySubscriptionPage'));

// Simple loading component
const LoadingPage = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Spinner size="lg" />
  </div>
);

// Simple error fallback component
const ErrorFallback = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center space-y-4">
      <h1 className="text-2xl font-bold">שגיאה באפליקציה</h1>
      <p className="text-muted-foreground">אנא רענן את הדף או נסה שוב מאוחר יותר</p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
      >
        רענן דף
      </button>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <BrowserRouter>
        <ThemeProvider>
          <DirectionProvider dir="rtl">
            <AuthProvider>
              <StockDataProvider refreshInterval={30000}>
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
                <Toaster richColors position="top-center" dir="rtl" />
              </StockDataProvider>
            </AuthProvider>
          </DirectionProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
