
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';
import { getPlanDetails } from '../PlanUtilities';

export const usePaymentInitialization = (
  selectedPlan: string,
  onPaymentComplete: () => void,
  onBack: () => void,
  setIsLoadingExternal?: (val: boolean) => void
) => {
  const { fullName, email, userData } = useSubscriptionContext();
  const { user } = useAuth();
  const [isLoading, setIsLoadingState] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  const setIsLoading = setIsLoadingExternal || setIsLoadingState;

  useEffect(() => {
    initiateCardcomPayment();
  }, []);

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    setInitError(null);
    
    try {
      const planDetails = getPlanDetails(selectedPlan);
      
      // Get registration data if available (for guest checkout)
      const registrationData = sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data') || '{}')
        : null;

      if (!user && !registrationData) {
        toast.error('נדרשים פרטי הרשמה כדי להמשיך');
        setInitError('נדרשים פרטי הרשמה');
        return;
      }

      // Extract user details
      const userFullName = fullName || registrationData?.userData?.fullName || '';
      const userEmail = email || user?.email || registrationData?.userData?.email || '';
      const userPhone = userData?.phone || registrationData?.userData?.phone || '';
      const userIdNumber = userData?.idNumber || registrationData?.userData?.idNumber || '';

      console.log('Payment initialization with correct plan details:', {
        plan: selectedPlan,
        operationType: planDetails.operationType,
        amount: planDetails.amount,
        hasTrial: planDetails.hasTrial,
        email: userEmail
      });

      const webhookUrl = `https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/cardcom-webhook`;
      const tempRegistrationId = user?.id || `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: userFullName,
        email: userEmail,
        operationType: planDetails.operationType, // Use correct operation type
        origin: window.location.origin,
        amount: planDetails.amount, // Use correct amount
        webHookUrl: webhookUrl,
        registrationData: registrationData,
        userDetails: {
          fullName: userFullName,
          email: userEmail,
          phone: userPhone,
          idNumber: userIdNumber
        },
        returnValue: tempRegistrationId,
        // Add trial information
        hasTrial: planDetails.hasTrial,
        trialDays: planDetails.trialDays || 0
      };

      const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
        body: payload
      });

      if (error) {
        throw new Error(error.message || 'שגיאה ביצירת עסקה');
      }

      if (data?.url) {
        if (tempRegistrationId.startsWith('temp_reg_')) {
          localStorage.setItem('temp_registration_id', tempRegistrationId);
          
          console.log('Payment initiated with correct settings:', {
            tempRegistrationId,
            planId: selectedPlan,
            operation: planDetails.operationType,
            amount: planDetails.amount,
            email: userEmail,
            hasTrial: planDetails.hasTrial
          });
        }
        
        setPaymentUrl(data.url);
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating Cardcom payment:', error);
      setInitError(error.message || 'שגיאה ביצירת עסקה');
      toast.error(error.message || 'שגיאה ביצירת עסקה');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    paymentUrl,
    initError,
    initiateCardcomPayment
  };
};
