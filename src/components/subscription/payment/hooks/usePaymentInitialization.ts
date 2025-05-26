
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';

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
    // Only initiate payment if we have the required data
    if (selectedPlan) {
      initiateCardcomPayment();
    }
  }, [selectedPlan]);

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    setInitError(null);
    
    try {
      // Get registration data if available (for guest checkout)
      let registrationData = null;
      try {
        const storedData = sessionStorage.getItem('registration_data');
        registrationData = storedData ? JSON.parse(storedData) : null;
      } catch (error) {
        console.warn('Failed to parse registration data:', error);
      }

      if (!user && !registrationData) {
        const errorMessage = 'נדרשים פרטי הרשמה כדי להמשיך';
        toast.error(errorMessage);
        setInitError(errorMessage);
        return;
      }

      // Extract user details safely
      const userFullName = fullName || 
        registrationData?.userData?.fullName || 
        `${registrationData?.userData?.firstName || ''} ${registrationData?.userData?.lastName || ''}`.trim() || 
        '';
      const userEmail = email || user?.email || registrationData?.userData?.email || registrationData?.email || '';
      const userPhone = userData?.phone || registrationData?.userData?.phone || '';
      const userIdNumber = userData?.idNumber || registrationData?.userData?.idNumber || '';

      console.log('Initiating payment with unified function:', {
        plan: selectedPlan,
        email: userEmail,
        isGuest: !user,
        hasRegistrationData: !!registrationData
      });

      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: userFullName,
        email: userEmail,
        phone: userPhone,
        idNumber: userIdNumber,
        origin: window.location.origin,
        registrationData: registrationData,
        userDetails: {
          fullName: userFullName,
          email: userEmail,
          phone: userPhone,
          idNumber: userIdNumber
        }
      };

      // Validate payload before sending
      if (!payload.email) {
        throw new Error('כתובת האימייל נדרשת להמשך התהליך');
      }

      const { data, error } = await supabase.functions.invoke('cardcom-unified-payment', {
        body: payload
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'שגיאה ביצירת עסקה');
      }

      if (data?.url) {
        console.log('Payment URL received:', {
          operationType: data.operationType,
          amount: data.amount,
          sessionId: data.sessionId
        });
        
        setPaymentUrl(data.url);
      } else {
        console.error('Invalid response from payment function:', data);
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating CardCom payment:', error);
      const errorMessage = error.message || 'שגיאה ביצירת עסקה';
      setInitError(errorMessage);
      toast.error(errorMessage);
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
