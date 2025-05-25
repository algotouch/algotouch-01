
import { useState, useEffect } from 'react';
import { RegistrationData } from '@/types/payment';

export const useUnifiedRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      try {
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          const data = JSON.parse(storedData);
          setRegistrationData(data);
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
  };

  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
  };

  return {
    registrationData,
    registrationError,
    updateRegistrationData,
    clearRegistrationData,
    isLoading
  };
};
