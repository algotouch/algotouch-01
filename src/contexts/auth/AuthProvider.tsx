
import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { supabase } from '@/lib/supabase-client';
import { RegistrationData as AuthRegistrationData } from './types';
import { toast } from 'sonner';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useSecureAuth();
  const [registrationData, setRegistrationData] = useState<AuthRegistrationData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Load registration data from session storage with better error handling
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        // Validate the data structure
        if (data && typeof data === 'object') {
          setRegistrationData(data);
          setIsRegistering(true);
          setPendingSubscription(true);
          console.log('Loaded registration data from storage');
        } else {
          console.warn('Invalid registration data structure, clearing');
          sessionStorage.removeItem('registration_data');
        }
      }
    } catch (error) {
      console.error("Error parsing registration data:", error);
      // Clear corrupted data
      try {
        sessionStorage.removeItem('registration_data');
      } catch (clearError) {
        console.error("Could not clear corrupted registration data:", clearError);
      }
      setInitError('שגיאה בטעינת נתוני הרשמה');
    }
  }, []);
  
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
      console.log('Updated registration data');
    } catch (error) {
      console.error('Error updating registration data:', error);
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
      setInitError(null);
      console.log('Cleared registration data');
    } catch (error) {
      console.error('Error clearing registration data:', error);
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
  
  // Show loading while auth is initializing
  if (!auth.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  // Show error state if there's an initialization error
  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-lg font-semibold">שגיאה באתחול המערכת</div>
          <p className="text-muted-foreground">{initError}</p>
          <button 
            onClick={() => {
              setInitError(null);
              clearRegistrationData();
              window.location.reload();
            }}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            נסה שוב
          </button>
        </div>
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
