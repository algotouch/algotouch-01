
import { useState, useEffect } from 'react';
import { RegistrationData } from '@/types/payment';

export const useUnifiedRegistrationData = () => {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('signup');

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
          
          // Set current step based on data completeness
          if (data.contractSigned) {
            setCurrentStep('payment');
          } else if (data.planId) {
            setCurrentStep('contract');
          } else if (data.email && data.userData) {
            // If we have user data but no plan, go to plan selection
            setCurrentStep('plan_selection');
            setPendingSubscription(true);
          } else {
            setCurrentStep('signup');
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
    if (!registrationData && !newData) return;
    
    const updatedData = { ...registrationData, ...newData };
    setRegistrationData(updatedData);
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    
    // Update pendingSubscription based on plan selection
    if (newData.planId) {
      setPendingSubscription(true);
      setCurrentStep('contract');
    }
    
    // Update step based on new data
    if (newData.contractSigned) {
      setCurrentStep('payment');
    }
  };

  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setPendingSubscription(false);
    setIsRegistering(false);
    setCurrentStep('signup');
  };

  const startRegistering = () => {
    setIsRegistering(true);
    setPendingSubscription(true);
  };

  const stopRegistering = () => {
    setIsRegistering(false);
  };

  const saveRegistrationStep = async (step: string, data: any) => {
    try {
      const tempRegId = localStorage.getItem('temp_registration_id') || 
                        `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      if (!localStorage.getItem('temp_registration_id')) {
        localStorage.setItem('temp_registration_id', tempRegId);
      }

      const registrationRecord = {
        id: tempRegId,
        registration_data: { ...registrationData, ...data, currentStep: step },
        step_completed: step,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        used: false
      };

      // Store locally first
      updateRegistrationData(data);
      setCurrentStep(step);
      
      console.log('Registration step saved:', { step, tempRegId });
      return { success: true, registrationId: tempRegId };
    } catch (error) {
      console.error('Error saving registration step:', error);
      setRegistrationError('שגיאה בשמירת שלב ההרשמה');
      return { success: false, error };
    }
  };

  const getRegistrationProgress = () => {
    const steps = ['signup', 'plan_selection', 'contract', 'payment', 'completed'];
    const currentIndex = steps.indexOf(currentStep);
    return {
      currentStep,
      currentStepIndex: currentIndex,
      totalSteps: steps.length,
      progressPercentage: Math.round((currentIndex / (steps.length - 1)) * 100),
      isComplete: currentStep === 'completed'
    };
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
    stopRegistering,
    currentStep,
    setCurrentStep,
    saveRegistrationStep,
    getRegistrationProgress
  };
};
