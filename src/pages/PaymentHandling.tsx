
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PaymentSuccess from '@/components/payment/PaymentSuccess';
import PaymentError from '@/components/payment/PaymentError';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase-client';

const PaymentHandling: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isSuccessParam = params.get('success') === 'true';
    const errorParam = params.get('error') === 'true';
    const planId = params.get('plan');
    const regId = params.get('regId');

    // Clear any existing payment temp data
    localStorage.removeItem('temp_payment_session');

    // Check authentication state
    if (!isAuthenticated && !regId) {
      console.log('User not authenticated, redirecting to login');
      navigate('/auth', { state: { from: location } });
      return;
    }

    const processPayment = async () => {
      try {
        setIsLoading(true);
        
        if (isSuccessParam) {
          // If we have a registration ID, verify the payment with the backend
          if (regId) {
            const { data, error } = await supabase.functions.invoke('verify-payment-registration', {
              body: { registrationId: regId }
            });
            
            if (error) throw new Error(error.message);
            if (!data.success) throw new Error(data.message || 'Payment verification failed');
            
            setIsSuccess(true);
            return;
          }
          
          // Regular payment success flow
          setIsSuccess(true);
          
          // Update user subscription status if needed
          if (user && planId) {
            await supabase.from('subscriptions').upsert({
              user_id: user.id,
              plan_type: planId,
              status: 'active',
              updated_at: new Date().toISOString()
            });
          }
        } else if (errorParam) {
          // Handle payment error
          setIsSuccess(false);
          setErrorMessage('התשלום נכשל או בוטל. אנא נסה שנית.');
        } else {
          // No status parameters, redirect to subscription page
          navigate('/subscription');
        }
      } catch (error: any) {
        console.error('Error processing payment result:', error);
        setIsSuccess(false);
        setErrorMessage(error.message || 'אירעה שגיאה בעיבוד התשלום');
      } finally {
        setIsLoading(false);
      }
    };

    processPayment();
  }, [location, navigate, user, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">מעבד את פרטי התשלום...</p>
      </div>
    );
  }

  if (isSuccess) {
    return <PaymentSuccess redirectPath="/dashboard" />;
  }

  // Using the updated PaymentError component with explicit redirectPath
  return <PaymentError message={errorMessage || 'אירעה שגיאה בתהליך התשלום'} redirectPath="/subscription" />;
};

export default PaymentHandling;
