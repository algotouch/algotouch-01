
import { useState, useEffect } from 'react';

interface RegistrationData {
  planId?: string;
  email?: string;
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractDetails?: any;
  userData?: {
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export function useRegistrationData() {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  // Load registration data from session storage on initial load
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setRegistrationData(parsedData);
        
        // If plan already selected, update state
        if (parsedData.planId) {
          setSelectedPlan(parsedData.planId);
        }
        
        // Determine current step based on stored data
        if (parsedData.contractSigned) {
          setCurrentStep(3); // Payment step
        } else if (parsedData.planId) {
          setCurrentStep(2); // Contract step
        }
      } catch (e) {
        console.error('Error parsing registration data:', e);
      }
    }
  }, []);

  // Update registration data and save to session storage
  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    setRegistrationData(prevData => {
      const updatedData = { ...prevData, ...newData } as RegistrationData;
      
      // Save to session storage
      sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      
      return updatedData;
    });
  };

  // Clear registration data
  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    setRegistrationData(null);
    setCurrentStep(1);
    setSelectedPlan(undefined);
  };

  return {
    registrationData,
    updateRegistrationData,
    clearRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan
  };
}
