
import { useState, useEffect } from 'react';

interface RegistrationData {
  email?: string;
  contractSigned?: boolean;
  planId?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  password?: string;
  contractDetails?: {
    contractHtml?: string;
    signature?: string;
    agreedToTerms?: boolean;
    agreedToPrivacy?: boolean;
    contractVersion?: string;
    browserInfo?: any;
  };
  contractSignedAt?: string;
  registrationTime?: string;
  paymentToken?: {
    token?: string;
    expiry?: string;
    last4Digits?: string;
    cardholderName?: string;
  };
}

export const useRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);

  // On component mount, load registration data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        
        // Check if the data is still valid (within 30 minutes)
        const registrationTime = data.registrationTime ? new Date(data.registrationTime) : null;
        const now = new Date();
        const isValid = registrationTime && ((now.getTime() - registrationTime.getTime()) < 30 * 60 * 1000);
        
        // If data is too old, ignore it
        if (!registrationTime || !isValid) {
          console.log('Registration data has expired, clearing session');
          sessionStorage.removeItem('registration_data');
          return;
        }
        
        console.log('Registration data found:', { 
          email: data.email, 
          firstName: data.userData?.firstName,
          registrationTime: data.registrationTime,
          hasPaymentToken: !!data.paymentToken,
          age: registrationTime ? Math.round((now.getTime() - registrationTime.getTime()) / 60000) + ' minutes' : 'unknown'
        });
        
        setRegistrationData(data);
        
        // Determine the current step based on stored registration data
        if (data.paymentToken?.token) {
          setCurrentStep(4); // Payment completed
          setSelectedPlan(data.planId);
        } else if (data.contractSigned) {
          setCurrentStep(3); // Ready for payment
          setSelectedPlan(data.planId);
        } else if (data.planId) {
          setCurrentStep(2); // Ready for contract
          setSelectedPlan(data.planId);
        }
      } catch (error) {
        console.error('Error parsing registration data:', error);
        sessionStorage.removeItem('registration_data');
      }
    }
  }, []);

  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    let updatedData: RegistrationData;
    
    if (registrationData) {
      updatedData = { ...registrationData, ...newData };
    } else {
      updatedData = {
        ...newData,
        registrationTime: newData.registrationTime || new Date().toISOString()
      } as RegistrationData;
    }
    
    setRegistrationData(updatedData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    
    // Automatically update steps based on data
    if (newData.paymentToken?.token) {
      setCurrentStep(4);
    } else if (newData.contractSigned) {
      setCurrentStep(3);
    } else if (newData.planId && currentStep === 1) {
      setCurrentStep(2);
    }
    
    if (newData.planId) {
      setSelectedPlan(newData.planId);
    }
  };

  const setPaymentToken = (tokenData: {
    token: string;
    expiry?: string;
    last4Digits?: string;
    cardholderName?: string;
  }) => {
    updateRegistrationData({
      paymentToken: tokenData
    });
  };

  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setCurrentStep(1);
    setSelectedPlan(undefined);
  };

  return {
    registrationData,
    updateRegistrationData,
    setPaymentToken,
    clearRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan
  };
};
