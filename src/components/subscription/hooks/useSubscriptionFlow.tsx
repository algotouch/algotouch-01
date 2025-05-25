
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { Steps } from '@/types/subscription';

export const useSubscriptionFlow = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, registrationData, setRegistrationData } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<Steps>('plan-selection');
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(planId);
  const [contractId, setContractId] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Get fullName from multiple sources with priority
  const getFullNameFromSources = async () => {
    console.log('useSubscriptionFlow: Getting fullName from sources', {
      hasRegistrationData: !!registrationData,
      hasUser: !!user,
      isAuthenticated
    });

    // Priority 1: Registration data (for signup flow)
    if (registrationData?.userData) {
      const { firstName, lastName } = registrationData.userData;
      const regFullName = `${firstName || ''} ${lastName || ''}`.trim();
      if (regFullName) {
        console.log('useSubscriptionFlow: Using fullName from registration data:', regFullName);
        return regFullName;
      }
    }

    // Priority 2: Check session storage for registration data
    try {
      const sessionData = sessionStorage.getItem('registration_data');
      if (sessionData) {
        const parsedData = JSON.parse(sessionData);
        if (parsedData.userData) {
          const { firstName, lastName } = parsedData.userData;
          const sessionFullName = `${firstName || ''} ${lastName || ''}`.trim();
          if (sessionFullName) {
            console.log('useSubscriptionFlow: Using fullName from session storage:', sessionFullName);
            return sessionFullName;
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing session storage registration data:', error);
    }

    // Priority 3: User profile from database (for authenticated users)
    if (isAuthenticated && user) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          const profileFullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
          if (profileFullName) {
            console.log('useSubscriptionFlow: Using fullName from user profile:', profileFullName);
            return profileFullName;
          }
        }
      } catch (error) {
        console.warn('Error fetching user profile:', error);
      }
    }

    console.log('useSubscriptionFlow: No fullName found from any source');
    return '';
  };

  // Initialize subscription flow based on auth state and URL parameters
  useEffect(() => {
    const initSubscriptionFlow = async () => {
      setIsLoading(true);
      
      try {
        // If plan ID is in URL params, use it
        if (planId) {
          setSelectedPlan(planId);
          
          // Update registration data with plan ID if we're in registration flow
          if (registrationData) {
            setRegistrationData({ ...registrationData, planId });
          }
          
          // If user already selected plan, move to contract step
          setCurrentStep('contract');
        } 
        // Otherwise, check if plan is in registration data
        else if (registrationData?.planId) {
          setSelectedPlan(registrationData.planId);
          
          // If contract is signed, move to payment step
          if (registrationData.contractSigned) {
            setCurrentStep('payment');
          } else {
            setCurrentStep('contract');
          }
        }
        
        // Check if user has active subscription
        let hasActiveSubscriptionCheck = false;
        if (isAuthenticated && user) {
          const { data: subscriptionData, error } = await supabase
            .from('subscriptions')
            .select('status, plan_type')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
            
          if (subscriptionData && !error) {
            hasActiveSubscriptionCheck = true;
            setHasActiveSubscription(true);
          }
        }
        
        // Get and set fullName
        const derivedFullName = await getFullNameFromSources();
        setFullName(derivedFullName);
        
        console.log('useSubscriptionFlow: Initialization complete', {
          selectedPlan: planId || registrationData?.planId,
          fullName: derivedFullName,
          currentStep,
          hasActiveSubscription: hasActiveSubscriptionCheck
        });
        
      } catch (error) {
        console.error('Error initializing subscription flow:', error);
        toast.error('אירעה שגיאה בטעינת נתוני ההרשמה');
      } finally {
        setIsLoading(false);
      }
    };
    
    initSubscriptionFlow();
  }, [planId, isAuthenticated, user, registrationData, setRegistrationData]);

  // Handle plan selection
  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    
    // Update registration data
    if (registrationData) {
      setRegistrationData({ ...registrationData, planId: plan });
    }
    
    setCurrentStep('contract');
    navigate(`/subscription`, { replace: true });
  };

  // Handle contract signing
  const handleContractSign = (contractId: string) => {
    setContractId(contractId);
    
    // Update registration data
    if (registrationData) {
      setRegistrationData({ 
        ...registrationData, 
        contractSigned: true 
      });
    }
    
    setCurrentStep('payment');
  };

  // Handle payment completion
  const handlePaymentComplete = () => {
    setCurrentStep('completion');
  };

  // Handle back navigation
  const handleBackToStep = (step: Steps) => {
    setCurrentStep(step);
  };

  return {
    currentStep,
    selectedPlan,
    fullName,
    isLoading,
    hasActiveSubscription,
    contractId,
    isAuthenticated,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete,
    handleBackToStep
  };
};
