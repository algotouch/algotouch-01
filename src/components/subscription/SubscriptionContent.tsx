
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SubscriptionSteps from '@/components/subscription/SubscriptionSteps';
import { useSubscriptionFlow } from './hooks/useSubscriptionFlow';
import SubscriptionView from './views/SubscriptionView';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';

const SubscriptionContent = () => {
  const { hasActiveSubscription, isCheckingSubscription } = useSubscriptionContext();
  const { isAuthenticated, registrationData, clearRegistrationData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasShownError, setHasShownError] = useState(false);
  const [isValidAccess, setIsValidAccess] = useState(false);
  
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

  const isLoading = flowLoading || isCheckingSubscription;

  // Check access validity
  useEffect(() => {
    console.log('SubscriptionContent: Checking access validity', {
      isAuthenticated,
      hasRegistrationData: !!registrationData,
      path: location.pathname
    });
    
    if (isAuthenticated || registrationData) {
      console.log('SubscriptionContent: Valid access detected');
      setIsValidAccess(true);
    } else {
      console.log('SubscriptionContent: Invalid access - no auth or registration data');
      setIsValidAccess(false);
    }
  }, [isAuthenticated, registrationData, location.pathname]);

  // Handle back to auth functionality
  const handleBackToAuth = () => {
    console.log('SubscriptionContent: Handling back to auth');
    clearRegistrationData();
    sessionStorage.removeItem('registration_data');
    navigate('/auth?tab=signup', { replace: true });
  };

  // Handle users with active subscription
  useEffect(() => {
    if (hasActiveSubscription && isAuthenticated) {
      console.log('SubscriptionContent: User has active subscription, redirecting');
      toast.success('יש לך כבר מנוי פעיל');
      navigate('/my-subscription', { replace: true });
      return;
    }
  }, [hasActiveSubscription, isAuthenticated, navigate]);

  // Show loading state
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

  // Show error state only if we really don't have any valid data and haven't shown error yet
  if (!isValidAccess && !hasShownError) {
    console.log('SubscriptionContent: No valid access state, showing error');
    setHasShownError(true);
    toast.error('נתוני הרשמה חסרים. אנא התחל תהליך הרשמה מחדש.');
    
    // Don't redirect immediately - let user see the message
    setTimeout(() => {
      handleBackToAuth();
    }, 3000);
    
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-lg font-semibold">שגיאה בטעינת נתוני הרשמה</div>
          <p className="text-muted-foreground">מעביר אותך לעמוד ההרשמה...</p>
          <button 
            onClick={handleBackToAuth}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            חזור להרשמה עכשיו
          </button>
        </div>
      </div>
    );
  }

  // Don't render content if access is not valid
  if (!isValidAccess) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">בודק הרשאות גישה...</p>
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
