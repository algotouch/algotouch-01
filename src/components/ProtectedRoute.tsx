
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';

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
  
  // Show loading while auth is initializing
  if (!initialized || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-background/90">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary mx-auto"></div>
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
    const hasValidAccess = isAuthenticated || 
                          (registrationData && pendingSubscription);
    
    if (hasValidAccess) {
      return <>{children}</>;
    }
    
    return <Navigate to="/auth?tab=signup&reason=subscription" replace />;
  }

  // Standard protected route logic
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
