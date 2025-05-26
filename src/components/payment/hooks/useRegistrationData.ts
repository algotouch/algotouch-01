import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';
import { RegistrationData } from '@/types/payment';

export const useRegistrationData = () => {
  const { 
    registrationData: contextRegistrationData, 
    setRegistrationData: updateContextRegistrationData,
    clearRegistrationData: clearContextRegistrationData,
    isRegistering,
    pendingSubscription,
    setPendingSubscription
  } = useAuth();
  
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(
    contextRegistrationData as RegistrationData | null
  );
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Sync local state with context when context changes
  useEffect(() => {
    if (contextRegistrationData) {
      setRegistrationData(contextRegistrationData as RegistrationData);
    }
  }, [contextRegistrationData]);

  const loadRegistrationData = () => {
    if (contextRegistrationData) {
      setRegistrationData(contextRegistrationData as RegistrationData);
      console.log("Loaded registration data from context:", {
        email: contextRegistrationData.email,
        hasUserData: !!contextRegistrationData.userData,
        planId: contextRegistrationData.planId
      });
      
      return true;
    } else {
      console.log("No registration data found but that's okay - user can pay first and register later");
      return true;
    }
  };

  const updateRegistrationData = useCallback((newData: Partial<RegistrationData>) => {
    if (!registrationData && !contextRegistrationData) return;
    
    const updatedData = {
      ...(registrationData || {}),
      ...newData
    };
    
    setRegistrationData(updatedData as RegistrationData);
    updateContextRegistrationData(updatedData);
  }, [registrationData, contextRegistrationData, updateContextRegistrationData]);

  const clearRegistrationData = () => {
    clearContextRegistrationData();
    setRegistrationData(null);
  };

  return {
    registrationData,
    registrationError,
    isRegistering,
    pendingSubscription,
    loadRegistrationData,
    updateRegistrationData,
    clearRegistrationData,
    setRegistrationError,
    setPendingSubscription
  };
};
