import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { RegistrationData as AuthRegistrationData } from './types';
import { supabase } from '@/lib/supabase-client';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  // Ensure component is mounted before using React hooks
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Don't initialize auth hooks until component is mounted
  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        user: null,
        session: null,
        loading: true,
        isAuthenticated: false,
        initialized: false,
        error: null,
        registrationData: null,
        isRegistering: false,
        pendingSubscription: false,
        signIn: async () => { throw new Error('AuthContext not initialized') },
        signUp: async () => { throw new Error('AuthContext not initialized') },
        signOut: async () => { throw new Error('AuthContext not initialized') },
        updateProfile: async () => { throw new Error('AuthContext not initialized') },
        resetPassword: async () => { throw new Error('AuthContext not initialized') },
        setRegistrationData: () => { throw new Error('AuthContext not initialized') },
        clearRegistrationData: () => { throw new Error('AuthContext not initialized') },
        setPendingSubscription: () => { throw new Error('AuthContext not initialized') },
        validateSession: async () => { throw new Error('AuthContext not initialized') }
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return <AuthProviderMounted>{children}</AuthProviderMounted>;
};

const AuthProviderMounted: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const navigate = useNavigate();
  const [hasError, setHasError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Registration state management
  const [registrationData, setRegistrationData] = useState<AuthRegistrationData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  
  // Load registration data from session storage on mount
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        
        console.log('AuthProvider: Found stored registration data:', {
          email: data.email,
          hasUserData: !!data.userData,
          timestamp: data.registrationTime
        });
        
        // Check if data is still valid (within 2 hours - extended time)
        const registrationTime = data.registrationTime ? new Date(data.registrationTime) : null;
        const now = new Date();
        const isValid = registrationTime && 
          ((now.getTime() - registrationTime.getTime()) < 2 * 60 * 60 * 1000); // 2 hours
        
        if (isValid) {
          console.log('AuthProvider: Registration data is valid, setting state');
          setRegistrationData({ ...data, isValid });
          setIsRegistering(true);
          setPendingSubscription(true);
        } else {
          console.log('AuthProvider: Registration data expired, clearing');
          // Clear stale registration data
          sessionStorage.removeItem('registration_data');
        }
      }
    } catch (error) {
      console.error("AuthProvider: Error parsing registration data:", error);
      sessionStorage.removeItem('registration_data');
    }
  }, []);
  
  // Update registration data in session storage when state changes
  const updateRegistrationData = (data: Partial<AuthRegistrationData>) => {
    console.log('AuthProvider: Updating registration data:', {
      email: data.email,
      hasUserData: !!data.userData
    });
    
    const updatedData = {
      ...(registrationData || {}),
      ...data,
      registrationTime: data.registrationTime || new Date().toISOString()
    };
    
    // Update state first
    setRegistrationData(updatedData as AuthRegistrationData);
    setIsRegistering(true);
    setPendingSubscription(true);
    
    // Then update sessionStorage
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    
    console.log('AuthProvider: Registration data updated successfully');
  };
  
  // Clear registration data
  const clearRegistrationData = () => {
    console.log('AuthProvider: Clearing registration data');
    sessionStorage.removeItem('registration_data');
    sessionStorage.removeItem('force_subscription_access');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setIsRegistering(false);
    setPendingSubscription(false);
  };
  
  // Validate session with the server
  const validateSession = async () => {
    if (!auth.session) return false;
    
    try {
      // Use the imported supabase client directly
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
  
  // Add error handling for auth initialization
  useEffect(() => {
    // Set a timeout to detect if auth initialization takes too long
    const timeoutId = setTimeout(() => {
      if (!auth.initialized && isInitializing) {
        console.error('Auth initialization took too long, showing error page');
        setHasError(true);
      }
    }, 10000); // 10 seconds timeout
    
    // Clear timeout when auth is initialized
    if (auth.initialized) {
      clearTimeout(timeoutId);
      setIsInitializing(false);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [auth.initialized, isInitializing]);
  
  // If there's an auth error, redirect to the error page
  useEffect(() => {
    if (hasError) {
      navigate('/auth-error', { replace: true });
    }
  }, [hasError, navigate]);
  
  // Show a global loader when auth is initializing to prevent flashes of content
  if (!auth.initialized && !hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }
  
  // If initialization is complete but there was an error
  if (hasError) {
    return null; // Will be redirected to error page via the useEffect
  }

  return (
    <AuthContext.Provider value={{
      ...auth,
      registrationData,
      isRegistering,
      pendingSubscription,
      setRegistrationData: updateRegistrationData,
      clearRegistrationData,
      setPendingSubscription,
      validateSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
