
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/contexts/theme/ThemeContext';
import { AuthProvider } from '@/contexts/auth/AuthContext';
import { StockDataProvider } from '@/contexts/stock/StockDataProvider';
import ProtectedRoute from '@/components/ProtectedRoute';

// Import pages directly
import Auth from '@/pages/Auth';
import Dashboard from '@/pages/Dashboard';
import Subscription from '@/pages/Subscription';
import MySubscriptionPage from '@/pages/MySubscriptionPage';
import Community from '@/pages/Community';
import Courses from '@/pages/Courses';
import CourseDetail from '@/pages/CourseDetail';
import Account from '@/pages/Account';
import MonthlyReport from '@/pages/MonthlyReport';
import Calendar from '@/pages/Calendar';
import TradeJournal from '@/pages/TradeJournal';
import Journal from '@/pages/Journal';
import Profile from '@/pages/Profile';
import NewTrade from '@/pages/NewTrade';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import AIAssistant from '@/pages/AIAssistant';
import ContractDetails from '@/pages/ContractDetails';
import IframeRedirect from '@/pages/IframeRedirect';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentFailed from '@/pages/PaymentFailed';
import NotFound from '@/pages/NotFound';
import AuthLoadError from '@/pages/AuthLoadError';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <StockDataProvider refreshInterval={30000}>
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
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
              <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
              <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/monthly-report" element={<ProtectedRoute><MonthlyReport /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
              <Route path="/trade-journal" element={<ProtectedRoute><TradeJournal /></ProtectedRoute>} />
              <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/new-trade" element={<ProtectedRoute><NewTrade /></ProtectedRoute>} />
              <Route path="/blog" element={<ProtectedRoute><Blog /></ProtectedRoute>} />
              <Route path="/blog/:id" element={<ProtectedRoute><BlogPost /></ProtectedRoute>} />
              <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
              <Route path="/contract/:contractId" element={<ProtectedRoute><ContractDetails /></ProtectedRoute>} />
              <Route path="/my-subscription" element={<ProtectedRoute><MySubscriptionPage /></ProtectedRoute>} />
              
              {/* Default route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            
            <Toaster richColors position="top-center" dir="rtl" />
          </StockDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
