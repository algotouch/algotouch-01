import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import { useSubscriptionFlow } from './hooks/useSubscriptionFlow';
import SubscriptionView from './views/SubscriptionView';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';
import { useUnifiedRegistrationData } from '@/hooks/useUnifiedRegistrationData';
import { Spinner } from '@/components/ui/spinner';

const SubscriptionContent = () => {
  const { hasActiveSubscription, isCheckingSubscription } = useSubscriptionContext();
  const { isAuthenticated } = useAuth();
  const { registrationData, clearRegistrationData, isLoading: regDataLoading } = useUnifiedRegistrationData();
  const navigate = useNavigate();
  const {
    currentStep,
    selectedPlan,
    fullName,
    isLoading: flowLoading,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete,
    handleBackToStep,
    contractId
  } = useSubscriptionFlow();

  // State to handle redirects
  const [shouldRedirectToAuth, setShouldRedirectToAuth] = useState(false);
  const [shouldRedirectToMySubscription, setShouldRedirectToMySubscription] = useState(false);

  const isLoading = regDataLoading || flowLoading || isCheckingSubscription;

  // Handle back to auth functionality
  const handleBackToAuth = () => {
    console.log('SubscriptionContent: Handling back to auth, clearing registration data');
    clearRegistrationData();
    sessionStorage.removeItem('registration_data');
    toast.info('נתוני ההרשמה נמחקו');
    navigate('/auth?tab=signup', { replace: true });
  };

  // Clear registration data if the user already has an active subscription
  useEffect(() => {
    if (hasActiveSubscription && registrationData) {
      console.log('SubscriptionContent: User has active subscription, clearing registration data');
      clearRegistrationData();
      sessionStorage.removeItem('registration_data');
      toast.info('כבר יש לך מנוי פעיל');
    }
  }, [hasActiveSubscription, registrationData, clearRegistrationData]);

  // Handle authenticated user with registration data
  useEffect(() => {
    if (isAuthenticated && registrationData && !hasActiveSubscription) {
      console.log('SubscriptionContent: Authenticated user with registration data but no active subscription');
      // Don't clear registration data here - let them continue the subscription process
      toast.info('אתה מחובר למערכת - אנא השלם את תהליך הרכישת המנוי');
    } else if (isAuthenticated && registrationData && hasActiveSubscription) {
      console.log('SubscriptionContent: Authenticated user with registration data and active subscription, clearing');
      clearRegistrationData();
      sessionStorage.removeItem('registration_data');
    }
  }, [isAuthenticated, registrationData, hasActiveSubscription, clearRegistrationData]);

  // Handle redirects based on authentication and subscription status
  useEffect(() => {
    if (!isLoading) {
      // If user has active subscription, redirect to my-subscription page
      if (isAuthenticated && hasActiveSubscription) {
        console.log('SubscriptionContent: User has active subscription, redirecting to my-subscription page');
        setShouldRedirectToMySubscription(true);
        return;
      }

      // If no registration data and user is not authenticated, redirect to signup
      if (!registrationData && !isAuthenticated) {
        console.log('SubscriptionContent: No registration data and not authenticated, redirecting to auth page');
        toast.error('נתוני הרשמה חסרים, אנא התחל תהליך הרשמה מחדש');
        setShouldRedirectToAuth(true);
        return;
      }
    }
  }, [isLoading, isAuthenticated, hasActiveSubscription, registrationData]);

  // Additional validation every time the step changes
  useEffect(() => {
    console.log(`SubscriptionContent: Current step changed to: ${currentStep}`, {
      selectedPlan,
      contractId,
      isAuthenticated,
      hasActiveSubscription
    });
    
    // Strict validation to ensure steps are followed in sequence
    if (currentStep === 'payment' && !selectedPlan) {
      console.error('Invalid flow state: payment step without selected plan, redirecting to plan selection');
      handleBackToStep('plan-selection');
    } else if (currentStep === 'payment' && !contractId) {
      console.error('Invalid flow state: payment step without signed contract, redirecting to contract step');
      handleBackToStep('contract');
    } else if (currentStep === 'contract' && !selectedPlan) {
      console.error('Invalid flow state: contract step without selected plan, redirecting to plan selection');
      handleBackToStep('plan-selection');
    }
    
  }, [currentStep, selectedPlan, contractId, isAuthenticated, hasActiveSubscription, handleBackToStep]);

  // Handle redirects after all hooks have been called
  if (shouldRedirectToMySubscription) {
    return <Navigate to="/my-subscription" replace />;
  }

  if (shouldRedirectToAuth) {
    return <Navigate to="/auth?tab=signup" replace />;
  }

  // Show loading state while data is being loaded
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">טוען נתוני מנוי...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">השלמת תהליך ההרשמה</h1>
        <p className="text-muted-foreground">יש להשלים את השלבים הבאים לקבלת גישה למערכת</p>
        
        <SubscriptionSteps currentStep={currentStep} />
      </div>
      
      <SubscriptionView
        currentStep={currentStep}
        selectedPlan={selectedPlan}
        fullName={fullName}
        onPlanSelect={handlePlanSelect}
        onContractSign={handleContractSign}
        onPaymentComplete={handlePaymentComplete}
        onBack={handleBackToStep}
        onBackToAuth={handleBackToAuth}
      />
    </div>
  );
};

export default SubscriptionContent;
