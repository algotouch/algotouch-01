
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  publicPaths?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  publicPaths = ['/auth']
}) => {
  const { 
    isAuthenticated, 
    loading, 
    initialized,
    registrationData,
    pendingSubscription
  } = useAuth();
  
  const location = useLocation();
  const [allowSubscriptionAccess, setAllowSubscriptionAccess] = useState(false);
  const [hasCheckedSessionStorage, setHasCheckedSessionStorage] = useState(false);
  const [sessionRegistrationData, setSessionRegistrationData] = useState(null);
  
  console.log('ProtectedRoute: Current state', {
    path: location.pathname,
    isAuthenticated,
    hasRegistrationData: !!registrationData,
    hasSessionData: !!sessionRegistrationData,
    pendingSubscription,
    loading,
    initialized,
    allowSubscriptionAccess,
    hasCheckedSessionStorage
  });
  
  // Check sessionStorage for registration data as backup
  useEffect(() => {
    if (!hasCheckedSessionStorage) {
      try {
        const storedData = sessionStorage.getItem('registration_data');
        const forceAccess = sessionStorage.getItem('force_subscription_access');
        
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('ProtectedRoute: Found data in sessionStorage:', {
            email: parsedData.email,
            hasUserData: !!parsedData.userData,
            timestamp: parsedData.registrationTime
          });
          setSessionRegistrationData(parsedData);
        }
        
        if (forceAccess === 'true') {
          console.log('ProtectedRoute: Force access flag detected');
          setAllowSubscriptionAccess(true);
        }
        
        setHasCheckedSessionStorage(true);
      } catch (error) {
        console.error('ProtectedRoute: Error checking sessionStorage:', error);
        setHasCheckedSessionStorage(true);
      }
    }
  }, [hasCheckedSessionStorage]);
  
  // Check for subscription access on registration data changes
  useEffect(() => {
    const hasAnyRegistrationData = registrationData || sessionRegistrationData;
    
    if (hasAnyRegistrationData && (pendingSubscription || sessionRegistrationData)) {
      console.log('ProtectedRoute: Granting subscription access due to registration data');
      setAllowSubscriptionAccess(true);
    } else if (!hasAnyRegistrationData && !isAuthenticated) {
      setAllowSubscriptionAccess(false);
    }
  }, [registrationData, sessionRegistrationData, pendingSubscription, isAuthenticated]);
  
  // Show loading while auth is initializing or while checking sessionStorage
  if (!initialized || loading || !hasCheckedSessionStorage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  // Check if current path is public
  const isPublicPath = publicPaths.some(publicPath => 
    location.pathname === publicPath || location.pathname.startsWith(`${publicPath}/`)
  );

  // Allow access to public paths
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Special handling for subscription page with enhanced logic
  if (location.pathname === '/subscription' || location.pathname.startsWith('/subscription/')) {
    console.log('ProtectedRoute: Subscription page access check', {
      isAuthenticated,
      hasRegistrationData: !!registrationData,
      hasSessionData: !!sessionRegistrationData,
      pendingSubscription,
      allowSubscriptionAccess
    });
    
    // Allow access if user is authenticated OR has valid registration data OR explicit access granted
    const hasValidAccess = isAuthenticated || 
                          allowSubscriptionAccess || 
                          (registrationData && pendingSubscription) ||
                          sessionRegistrationData;
    
    if (hasValidAccess) {
      console.log('ProtectedRoute: Allowing access to subscription page');
      return <>{children}</>;
    }
    
    console.log('ProtectedRoute: No valid auth state for subscription, redirecting to auth');
    return <Navigate to="/auth?tab=signup&reason=subscription" replace />;
  }

  // Standard protected route logic
  if (requireAuth && !isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    console.log('ProtectedRoute: User already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
