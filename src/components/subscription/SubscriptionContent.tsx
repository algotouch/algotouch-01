
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

  // Handle back to auth functionality
  const handleBackToAuth = () => {
    console.log('SubscriptionContent: Handling back to auth');
    clearRegistrationData();
    sessionStorage.removeItem('registration_data');
    // Clear redirect counters
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('redirect_count_')) {
        sessionStorage.removeItem(key);
      }
    });
    navigate('/auth?tab=signup', { replace: true });
  };

  // Check for URL parameters that indicate we were forced here
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const forced = urlParams.get('forced');
    const reason = urlParams.get('reason');
    
    if (forced === 'true' && !hasShownError) {
      setHasShownError(true);
      toast.error('זוהתה בעיה בניתוב. אנא התחל מחדש.');
      setTimeout(() => {
        handleBackToAuth();
      }, 2000);
      return;
    }
    
    if (reason === 'subscription' && !registrationData && !isAuthenticated && !hasShownError) {
      setHasShownError(true);
      toast.info('אנא השלם את תהליך ההרשמה תחילה');
    }
  }, [location.search, registrationData, isAuthenticated, hasShownError]);

  // Handle users with active subscription
  useEffect(() => {
    if (hasActiveSubscription && isAuthenticated) {
      console.log('SubscriptionContent: User has active subscription, redirecting');
      toast.success('יש לך כבר מנוי פעיל');
      navigate('/my-subscription', { replace: true });
      return;
    }
  }, [hasActiveSubscription, isAuthenticated, navigate]);

  // Validation logic - but don't redirect immediately to prevent loops
  useEffect(() => {
    if (!isLoading && !hasActiveSubscription) {
      // If no registration data and not authenticated, show error but don't redirect immediately
      if (!registrationData && !isAuthenticated && !hasShownError) {
        console.log('SubscriptionContent: Missing registration data and not authenticated');
        setHasShownError(true);
        toast.error('נתוני הרשמה חסרים. אנא התחל תהליך הרשמה מחדש.');
        
        // Delay redirect to prevent immediate loop
        setTimeout(() => {
          handleBackToAuth();
        }, 3000);
      }
    }
  }, [isLoading, registrationData, isAuthenticated, hasActiveSubscription, hasShownError]);

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

  // Show error state if we have shown an error
  if (hasShownError && !registrationData && !isAuthenticated) {
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
