
import { useState, useCallback } from 'react';

interface RegistrationData {
  email?: string;
  password?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  registrationTime?: string;
}

export const useUnifiedRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  const updateRegistrationData = useCallback((data: Partial<RegistrationData>) => {
    const updatedData = {
      ...(registrationData || {}),
      ...data,
      registrationTime: data.registrationTime || new Date().toISOString()
    };
    
    setRegistrationData(updatedData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
  }, [registrationData]);

  const clearRegistrationData = useCallback(() => {
    sessionStorage.removeItem('registration_data');
    sessionStorage.removeItem('force_subscription_access');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
  }, []);

  return {
    registrationData,
    updateRegistrationData,
    clearRegistrationData
  };
};
