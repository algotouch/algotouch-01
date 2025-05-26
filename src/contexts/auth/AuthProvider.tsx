
import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { supabase } from '@/lib/supabase-client';
import { RegistrationData as AuthRegistrationData } from './types';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const [registrationData, setRegistrationData] = useState<AuthRegistrationData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  
  // Load registration data from session storage
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        setRegistrationData(data);
        setIsRegistering(true);
        setPendingSubscription(true);
      }
    } catch (error) {
      console.error("Error parsing registration data:", error);
      sessionStorage.removeItem('registration_data');
    }
  }, []);
  
  const updateRegistrationData = (data: Partial<AuthRegistrationData>) => {
    const updatedData = {
      ...(registrationData || {}),
      ...data,
      registrationTime: data.registrationTime || new Date().toISOString()
    };
    
    setRegistrationData(updatedData as AuthRegistrationData);
    setIsRegistering(true);
    setPendingSubscription(true);
    
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
  };
  
  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    sessionStorage.removeItem('force_subscription_access');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setIsRegistering(false);
    setPendingSubscription(false);
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
  
  // Show loading while auth is initializing
  if (!auth.initialized) {
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
