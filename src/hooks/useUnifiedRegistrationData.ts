
import { useState, useEffect } from 'react';
import { RegistrationData } from '@/types/payment';

export const useUnifiedRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const loadData = () => {
      try {
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          const data = JSON.parse(storedData);
          setRegistrationData(data);
          
          // Set pendingSubscription if we have registration data with a plan
          if (data.planId) {
            setPendingSubscription(true);
          }
        }
        
        // Check if we have a temp registration ID
        const tempRegId = localStorage.getItem('temp_registration_id');
        if (tempRegId) {
          setPendingSubscription(true);
        }
      } catch (error) {
        console.error('Error loading registration data:', error);
        setRegistrationError('שגיאה בטעינת נתוני ההרשמה');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    if (!registrationData) return;
    
    const updatedData = { ...registrationData, ...newData };
    setRegistrationData(updatedData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    
    // Update pendingSubscription based on plan selection
    if (newData.planId) {
      setPendingSubscription(true);
    }
  };

  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setPendingSubscription(false);
    setIsRegistering(false);
  };

  const startRegistering = () => {
    setIsRegistering(true);
  };

  const stopRegistering = () => {
    setIsRegistering(false);
  };

  return {
    registrationData,
    registrationError,
    updateRegistrationData,
    clearRegistrationData,
    isLoading,
    pendingSubscription,
    isRegistering,
    startRegistering,
    stopRegistering
  };
};
