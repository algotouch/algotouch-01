
import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { supabase } from '@/lib/supabase-client';
import { RegistrationData as AuthRegistrationData } from './types';
import { toast } from 'sonner';
import ContextErrorBoundary from '@/components/ContextErrorBoundary';

interface SafeAuthProviderProps {
  children: React.ReactNode;
}

export const SafeAuthProvider: React.FC<SafeAuthProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // State for registration data management
  const [registrationData, setRegistrationData] = useState<AuthRegistrationData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);

  // Initialize auth with retry mechanism
  const initializeAuth = async () => {
    try {
      console.log(`SafeAuthProvider: Initializing auth (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Check React environment before proceeding
      if (!React || typeof React.useState !== 'function') {
        throw new Error('React environment is not properly initialized');
      }

      // Load registration data with error handling
      try {
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          const data = JSON.parse(storedData);
          if (data && typeof data === 'object') {
            setRegistrationData(data);
            setIsRegistering(true);
            setPendingSubscription(true);
            console.log('SafeAuthProvider: Loaded registration data from storage');
          }
        }
      } catch (error) {
        console.error("SafeAuthProvider: Error parsing registration data:", error);
        try {
          sessionStorage.removeItem('registration_data');
        } catch (clearError) {
          console.error("Could not clear corrupted registration data:", clearError);
        }
      }

      setIsReady(true);
      setInitError(null);
      console.log('SafeAuthProvider: Initialization successful');
      
    } catch (error) {
      console.error('SafeAuthProvider: Initialization failed:', error);
      
      if (retryCount < maxRetries - 1) {
        setRetryCount(prev => prev + 1);
        // Exponential backoff
        setTimeout(() => {
          initializeAuth();
        }, 1000 * Math.pow(2, retryCount));
      } else {
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setIsReady(true); // Allow rendering with error state
      }
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  // Only call useSecureAuth after initialization
  const auth = isReady && !initError ? useSecureAuth() : {
    session: null,
    user: null,
    loading: true,
    isAuthenticated: false,
    initialized: false,
    error: null,
    signIn: async () => ({ success: false, error: new Error('Auth not initialized') }),
    signUp: async () => ({ success: false, error: new Error('Auth not initialized') }),
    signOut: async () => {},
    updateProfile: async () => ({ success: false, error: new Error('Auth not initialized') }),
    resetPassword: async () => ({ success: false, error: new Error('Auth not initialized') })
  };

  const updateRegistrationData = (data: Partial<AuthRegistrationData>) => {
    try {
      const updatedData = {
        ...(registrationData || {}),
        ...data,
        registrationTime: data.registrationTime || new Date().toISOString()
      };
      
      setRegistrationData(updatedData as AuthRegistrationData);
      setIsRegistering(true);
      setPendingSubscription(true);
      
      sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      console.log('SafeAuthProvider: Updated registration data');
    } catch (error) {
      console.error('SafeAuthProvider: Error updating registration data:', error);
      toast.error('שגיאה בשמירת נתוני הרשמה');
    }
  };
  
  const clearRegistrationData = () => {
    try {
      sessionStorage.removeItem('registration_data');
      sessionStorage.removeItem('force_subscription_access');
      localStorage.removeItem('temp_registration_id');
      setRegistrationData(null);
      setIsRegistering(false);
      setPendingSubscription(false);
      console.log('SafeAuthProvider: Cleared registration data');
    } catch (error) {
      console.error('SafeAuthProvider: Error clearing registration data:', error);
    }
  };
  
  const validateSession = async () => {
    if (!auth.session) return false;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Session validation error:', error);
        return false;
      }
      
      return !!data.user;
    } catch (error) {
      console.error('Session validation exception:', error);
      return false;
    }
  };

  // Show loading state while initializing
  if (!isReady || (!initError && auth.loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary mx-auto"></div>
          <p className="text-muted-foreground">מאתחל מערכת אימות...</p>
          {retryCount > 0 && (
            <p className="text-sm text-muted-foreground">
              ניסיון {retryCount + 1} מתוך {maxRetries}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-lg font-semibold">שגיאה באתחול מערכת האימות</div>
          <p className="text-muted-foreground">{initError}</p>
          <div className="space-x-2">
            <button 
              onClick={() => {
                setInitError(null);
                setRetryCount(0);
                initializeAuth();
              }}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              נסה שוב
            </button>
            <button 
              onClick={() => {
                clearRegistrationData();
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              רענן דף
            </button>
          </div>
        </div>
      </div>
    );
  }

  const contextValue = {
    ...auth,
    registrationData,
    isRegistering,
    pendingSubscription,
    setRegistrationData: updateRegistrationData,
    clearRegistrationData,
    setPendingSubscription,
    validateSession
  };

  return (
    <ContextErrorBoundary contextName="AuthContext">
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    </ContextErrorBoundary>
  );
};
