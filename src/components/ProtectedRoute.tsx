
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
  
  console.log('ProtectedRoute: Current state', {
    path: location.pathname,
    isAuthenticated,
    hasRegistrationData: !!registrationData,
    pendingSubscription,
    loading,
    initialized
  });
  
  // Show loading while auth is initializing
  if (!initialized || loading) {
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

  // Special handling for subscription page
  if (location.pathname === '/subscription' || location.pathname.startsWith('/subscription/')) {
    console.log('ProtectedRoute: Subscription page access check', {
      isAuthenticated,
      hasRegistrationData: !!registrationData,
      pendingSubscription
    });
    
    // Allow access if user is authenticated OR has valid registration data
    if (isAuthenticated || (registrationData && pendingSubscription)) {
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
