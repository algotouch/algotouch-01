import { useState, useEffect } from 'react';
import { encrypt, decrypt } from '@/utils/encryption';

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

// Validation and sanitization helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{9,10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validateName = (name: string): boolean => {
  return name.length >= 2 && /^[a-zA-Z\u0590-\u05FF\s]+$/.test(name);
};

const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[&]/g, '&amp;') // Escape ampersands
    .trim();
};

export const useRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Helper function to sanitize sensitive data for logging
  const sanitizeForLogging = (data: any): any => {
    if (!data) return data;
    const sanitized = { ...data };
    if (sanitized.email) sanitized.email = sanitized.email.replace(/(?<=.{3}).(?=.*@)/g, '*');
    if (sanitized.password) sanitized.password = '********';
    if (sanitized.paymentToken) {
      sanitized.paymentToken = {
        ...sanitized.paymentToken,
        token: '****',
        cardholderName: sanitized.paymentToken.cardholderName?.replace(/(?<=.{1})./g, '*'),
      };
    }
    if (sanitized.userData) {
      sanitized.userData = {
        ...sanitized.userData,
        phone: sanitized.userData.phone?.replace(/(?<=.{3}).(?=.{4})/g, '*'),
      };
    }
    return sanitized;
  };

  // Validate registration data
  const validateRegistrationData = (data: Partial<RegistrationData>): boolean => {
    const errors: Record<string, string> = {};

    if (data.email && !validateEmail(data.email)) {
      errors.email = 'כתובת אימייל לא תקינה';
    }

    if (data.userData) {
      if (data.userData.firstName && !validateName(data.userData.firstName)) {
        errors.firstName = 'שם פרטי לא תקין';
      }
      if (data.userData.lastName && !validateName(data.userData.lastName)) {
        errors.lastName = 'שם משפחה לא תקין';
      }
      if (data.userData.phone && !validatePhone(data.userData.phone)) {
        errors.phone = 'מספר טלפון לא תקין';
      }
    }

    if (data.password && data.password.length < 8) {
      errors.password = 'סיסמה חייבת להכיל לפחות 8 תווים';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // On component mount, load registration data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const decryptedData = decrypt(storedData);
        const data = JSON.parse(decryptedData);
        
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
        
        // Validate loaded data
        if (!validateRegistrationData(data)) {
          console.error('Invalid registration data found');
          sessionStorage.removeItem('registration_data');
          return;
        }
        
        console.log('Registration data found:', sanitizeForLogging({ 
          email: data.email, 
          firstName: data.userData?.firstName,
          registrationTime: data.registrationTime,
          hasPaymentToken: !!data.paymentToken,
          age: registrationTime ? Math.round((now.getTime() - registrationTime.getTime()) / 60000) + ' minutes' : 'unknown'
        }));
        
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
        console.error('Error parsing registration data');
        sessionStorage.removeItem('registration_data');
      }
    }
  }, []);

  const updateRegistrationData = (newData: Partial<RegistrationData>) => {
    // Sanitize input data
    const sanitizedData = {
      ...newData,
      email: newData.email ? sanitizeInput(newData.email) : undefined,
      userData: newData.userData ? {
        ...newData.userData,
        firstName: newData.userData.firstName ? sanitizeInput(newData.userData.firstName) : undefined,
        lastName: newData.userData.lastName ? sanitizeInput(newData.userData.lastName) : undefined,
        phone: newData.userData.phone ? sanitizeInput(newData.userData.phone) : undefined,
      } : undefined,
    };

    // Validate data before updating
    if (!validateRegistrationData(sanitizedData)) {
      return;
    }

    let updatedData: RegistrationData;
    
    if (registrationData) {
      updatedData = { ...registrationData, ...sanitizedData };
    } else {
      updatedData = {
        ...sanitizedData,
        registrationTime: newData.registrationTime || new Date().toISOString()
      } as RegistrationData;
    }
    
    setRegistrationData(updatedData);
    // Encrypt data before storing
    const encryptedData = encrypt(JSON.stringify(updatedData));
    sessionStorage.setItem('registration_data', encryptedData);
    
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
    setValidationErrors({});
  };

  return {
    registrationData,
    updateRegistrationData,
    setPaymentToken,
    clearRegistrationData,
    currentStep,
    setCurrentStep,
    selectedPlan,
    setSelectedPlan,
    validationErrors
  };
};
