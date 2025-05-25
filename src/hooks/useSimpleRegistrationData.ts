
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';

// Simplified registration data hook that works with useAuth
export const useSimpleRegistrationData = () => {
  const { registrationData, setRegistrationData, clearRegistrationData, pendingSubscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Simple getter for registration data
  const getRegistrationData = () => {
    return registrationData;
  };

  // Simple setter that also updates session storage
  const updateRegistrationData = (newData: any) => {
    setRegistrationData(newData);
  };

  // Simple clear function
  const clearData = () => {
    clearRegistrationData();
  };

  return {
    registrationData,
    updateRegistrationData,
    clearRegistrationData: clearData,
    pendingSubscription,
    isLoading,
    isRegistering: !!registrationData,
    getRegistrationData
  };
};
