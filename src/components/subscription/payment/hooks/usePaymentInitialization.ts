
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
    initiateCardcomPayment();
  }, []);

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    setInitError(null);
    
    try {
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

      console.log('Initiating payment with unified function:', {
        plan: selectedPlan,
        email: userEmail,
        isGuest: !user
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

      const { data, error } = await supabase.functions.invoke('cardcom-unified-payment', {
        body: payload
      });

      if (error) {
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
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating CardCom payment:', error);
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
