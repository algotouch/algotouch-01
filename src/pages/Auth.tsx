
import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import ErrorBoundary from '@/components/ErrorBoundary';

const Auth = () => {
  const { 
    isAuthenticated, 
    loading, 
    initialized, 
    error,
    registrationData,
    clearRegistrationData
  } = useAuth();
  
  const [activeTab, setActiveTab] = React.useState<'login' | 'signup'>('login');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { from?: Location, redirectToSubscription?: boolean };

  // Get initial tab from URL if present
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const tab = params.get('tab');
      const reset = params.get('reset');
      const forced = params.get('forced');
      
      // Handle forced reset
      if (reset === 'true' || forced === 'true') {
        console.log('Auth: Forced reset detected, clearing all data');
        clearRegistrationData();
        sessionStorage.clear();
        
        // Clear the URL parameters
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('reset');
        newUrl.searchParams.delete('forced');
        newUrl.searchParams.delete('reason');
        window.history.replaceState({}, '', newUrl.toString());
        
        toast.info('המערכת אופסה. אנא התחל מחדש.');
      }
      
      if (tab === 'signup') {
        setActiveTab('signup');
      } else if (tab === 'login') {
        setActiveTab('login');
      }
    } catch (error) {
      console.error("Error parsing URL params:", error);
    }
  }, [location, clearRegistrationData]);

  // Check if the state specifies to show the signup tab
  useEffect(() => {
    if (state?.redirectToSubscription) {
      setActiveTab('signup');
    }
  }, [state]);

  // Store any auth error in localStorage for the error page
  useEffect(() => {
    if (error) {
      try {
        localStorage.setItem('auth_error', error.message || 'Unknown auth error');
        navigate('/auth-error', { replace: true });
      } catch (e) {
        console.error('Failed to store auth error:', e);
      }
    }
  }, [error, navigate]);
  
  // Handle stale registration data
  useEffect(() => {
    if (registrationData && !isAuthenticated) {
      const registrationTime = registrationData.registrationTime ? 
        new Date(registrationData.registrationTime).getTime() : 0;
      const now = new Date().getTime();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      
      if (now - registrationTime > twoHoursMs) {
        console.log('Auth: Registration data is very stale, clearing');
        clearRegistrationData();
        toast.info('מידע ההרשמה הישן נמחק. אנא התחל מחדש');
      }
    }
  }, [registrationData, isAuthenticated, clearRegistrationData]);

  // Function to switch tabs
  const handleSwitchToLogin = () => {
    console.log('Auth: Switching to login tab');
    setActiveTab('login');
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', 'login');
    navigate(currentUrl.pathname + currentUrl.search, { replace: true });
  };

  const handleSwitchToSignup = () => {
    console.log('Auth: Switching to signup tab');
    setActiveTab('signup');
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', 'signup');
    navigate(currentUrl.pathname + currentUrl.search, { replace: true });
  };

  // Show loading state while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90 p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated) {
    console.log("Auth page: User is authenticated, redirecting to dashboard");
    
    // Clear any stale registration data for authenticated users
    if (registrationData) {
      console.log("Auth: Clearing registration data for authenticated user");
      clearRegistrationData();
    }
    
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ErrorBoundary fallback={
      <div className="flex min-h-screen items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">שגיאה בטעינת עמוד ההתחברות</h2>
          <p className="mb-4">אירעה שגיאה בטעינת העמוד. אנא נסה שוב מאוחר יותר.</p>
          <button 
            onClick={() => navigate('/auth-error')} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            פרטי שגיאה
          </button>
        </div>
      </div>
    }>
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-background/90 p-4 dark:bg-background dark:text-foreground" dir="rtl">
        <div className="w-full max-w-md space-y-6">
          <AuthHeader />
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')} defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signup">הרשמה</TabsTrigger>
              <TabsTrigger value="login">התחברות</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="signup">
              <SignupForm onSwitchToLogin={handleSwitchToLogin} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Auth;
