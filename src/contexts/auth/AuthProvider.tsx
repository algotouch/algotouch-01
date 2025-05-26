
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { RegistrationData as AuthRegistrationData } from './types';
import { supabase } from '@/lib/supabase-client';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        
        // Check if data is still valid (within 2 hours)
        const registrationTime = data.registrationTime ? new Date(data.registrationTime) : null;
        const now = new Date();
        const isValid = registrationTime && 
          ((now.getTime() - registrationTime.getTime()) < 2 * 60 * 60 * 1000);
        
        if (isValid) {
          console.log('AuthProvider: Registration data is valid, setting state');
          setRegistrationData({ ...data, isValid });
          setIsRegistering(true);
          setPendingSubscription(true);
        } else {
          console.log('AuthProvider: Registration data expired, clearing');
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
    
    setRegistrationData(updatedData as AuthRegistrationData);
    setIsRegistering(true);
    setPendingSubscription(true);
    
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
  
  // Handle initialization timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!auth.initialized && isInitializing) {
        console.warn('Auth initialization timeout, continuing with default state');
        setIsInitializing(false);
      }
    }, 10000);
    
    if (auth.initialized) {
      clearTimeout(timeoutId);
      setIsInitializing(false);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [auth.initialized, isInitializing]);
  
  // Handle auth errors
  useEffect(() => {
    if (auth.error) {
      console.error('Auth error detected:', auth.error);
      // Don't redirect on every error, just log it
      setHasError(false); // Reset error state to prevent redirect loops
    }
  }, [auth.error]);
  
  // Show loading only briefly during initialization
  if (!auth.initialized && isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
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
