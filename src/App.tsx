import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { AuthProvider } from '@/contexts/auth';
import { DirectionProvider } from '@/contexts/direction/DirectionProvider';
import { StockDataProvider } from '@/contexts/stock/StockDataContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Eagerly loaded routes for critical paths
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import IframeRedirect from '@/pages/IframeRedirect';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentFailed from '@/pages/PaymentFailed';
import NotFound from '@/pages/NotFound';
import AuthLoadError from '@/pages/AuthLoadError';

// Lazy loaded routes with retry utility
const loadModuleWithRetry = (importFn: () => Promise<any>, name: string) => {
  console.log(`Loading module: ${name}`);
  return importFn().catch(error => {
    console.error(`Error loading ${name}:`, error);
    throw error;
  });
};

// Lazy loaded less critical routes
const Subscription = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Subscription'), 'Subscription')
);

// Fix imports for components that may have different export names
const Community = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Community'), 'Community')
);

const Courses = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Courses'), 'Courses')
);

const CourseDetail = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/CourseDetail'), 'CourseDetail')
);

const Account = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Account'), 'Account')
);

// Add missing page components
const MonthlyReport = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/MonthlyReport'), 'MonthlyReport')
);
const Calendar = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Calendar'), 'Calendar')
);
const TradeJournal = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/TradeJournal'), 'TradeJournal')
);
const Journal = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Journal'), 'Journal')
);
const Profile = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Profile'), 'Profile')
);
const NewTrade = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/NewTrade'), 'NewTrade')
);
const Blog = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/Blog'), 'Blog')
);
const BlogPost = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/BlogPost'), 'BlogPost')
);
const AIAssistant = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/AIAssistant'), 'AIAssistant')
);
const ContractDetails = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/ContractDetails'), 'ContractDetails')
);
const MySubscriptionPage = lazy(() => 
  loadModuleWithRetry(() => import('@/pages/MySubscriptionPage'), 'MySubscriptionPage')
);

// Loading component for Suspense
const LoadingPage = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Spinner size="lg" />
  </div>
);

function App() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <DirectionProvider dir="rtl">
          <AuthProvider>
            <StockDataProvider refreshInterval={30000}>
              <Suspense fallback={<LoadingPage />}>
                <Routes>
                  {/* Auth Error Route */}
                  <Route path="/auth-error" element={<AuthLoadError />} />
                  
                  {/* Public routes - eagerly loaded */}
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Payment routes - eagerly loaded */}
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
                    
                    {/* Add missing routes here */}
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
      </BrowserRouter>
    </React.StrictMode>
  );
}

export default App;
