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
  
  // Use either the external loading state or the internal one
  const setIsLoading = setIsLoadingExternal || setIsLoadingState;

  // Automatically create iframe payment URL on component mount
  useEffect(() => {
    initiateCardcomPayment();
    // Intentionally empty dependency array - we want this to run only once on mount
  }, []);

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    setInitError(null);
    
    try {
      // Define operation types based on plan
      let operationType = 3; // Default to CreateTokenOnly for monthly plan
      
      if (selectedPlan === 'annual') {
        operationType = 2; // Charge and create token
      } else if (selectedPlan === 'vip') {
        operationType = 1; // Charge only
      }

      // Get registration data if available (for guest checkout)
      const registrationData = sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data') || '{}')
        : null;

      if (!user && !registrationData) {
        toast.error('נדרשים פרטי הרשמה כדי להמשיך');
        setInitError('נדרשים פרטי הרשמה');
        return;
      }

      // Extract user details from the context data or registration data
      const userFullName = fullName || registrationData?.userData?.fullName || '';
      const userEmail = email || user?.email || registrationData?.userData?.email || '';
      const userPhone = userData?.phone || registrationData?.userData?.phone || '';
      const userIdNumber = userData?.idNumber || registrationData?.userData?.idNumber || '';

      // Validate required fields
      if (!userFullName || !userEmail) {
        toast.error('נדרשים שם מלא וכתובת אימייל');
        setInitError('חסרים פרטים נדרשים');
        return;
      }

      // Get plan amount based on selected plan
      const getPlanAmount = (plan: string) => {
        switch (plan) {
          case 'monthly':
            return '371.00'; // ₪371 per month
          case 'annual':
            return '3371.00'; // ₪3371 per year
          case 'vip':
            return '13121.00'; // ₪13121 one-time
          default:
            return '0.00';
        }
      };

      // Log payment initialization parameters for debugging
      console.log('Payment initialization parameters:', {
        plan: selectedPlan,
        fullName: userFullName,
        email: userEmail,
        phone: userPhone,
        idNumber: userIdNumber,
        operationType,
        amount: getPlanAmount(selectedPlan),
        userId: user?.id || 'guest'
      });

      // Set the webhook URL to the full Supabase Edge Function URL
      const webhookUrl = `${window.location.origin}/functions/v1/cardcom-webhook`;

      // Generate a temp registration ID with consistent format
      const tempRegistrationId = user?.id || `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Store registration data temporarily if this is a new user
      if (!user && registrationData) {
        try {
          const { error: storageError } = await supabase
            .from('temp_registration_data')
            .insert({
              id: tempRegistrationId,
              registration_data: {
                ...registrationData,
                paymentToken: null,
                registrationTime: new Date().toISOString()
              },
              expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 min expiry
            });

          if (storageError) {
            console.error('Error storing temp registration:', storageError);
            throw new Error('Failed to store registration data');
          }
        } catch (error) {
          console.error('Error in temp registration storage:', error);
          throw new Error('Error storing registration data');
        }
      }

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: userFullName,
        email: userEmail,
        operationType, 
        origin: window.location.origin,
        amount: getPlanAmount(selectedPlan),
        webHookUrl: webhookUrl,
        registrationData: registrationData,
        userDetails: {
          fullName: userFullName,
          email: userEmail,
          phone: userPhone,
          idNumber: userIdNumber
        },
        returnValue: tempRegistrationId
      };

      const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
        body: payload
      });

      if (error) {
        console.error('Cardcom payment initialization error:', error);
        throw new Error(error.message || 'שגיאה ביצירת עסקה');
      }

      if (data?.url) {
        // Store temporary registration ID if available
        if (tempRegistrationId.startsWith('temp_reg_')) {
          localStorage.setItem('temp_registration_id', tempRegistrationId);
          
          // Also log important information to help with debugging
          console.log('Payment initiated with:', {
            tempRegistrationId,
            planId: selectedPlan,
            operation: operationType,
            email: userEmail
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
