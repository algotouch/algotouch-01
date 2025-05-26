import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { paymentService } from '@/components/payment/services/paymentService';
import { paymentLogger } from '@/services/logging/paymentLogger';
import { useAuth } from '@/contexts/auth/AuthContext';

interface PaymentInitializationResult {
  paymentUrl: string | null;
  loading: boolean;
  error: Error | null;
  initializePayment: () => Promise<void>;
}

export const usePaymentInitialization = (
  planId: string,
  successUrl: string,
  cancelUrl: string
): PaymentInitializationResult => {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const initializePayment = useCallback(async () => {
    if (!user?.id) {
      toast.error('User ID is missing. Please ensure the user is authenticated.');
      setError(new Error('User ID is missing'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      paymentLogger.log('Initializing payment...', { planId, userId: user.id });
      const url = await paymentService.createPaymentLink(planId, user.id, successUrl, cancelUrl);
      setPaymentUrl(url);
      paymentLogger.log('Payment URL received', { paymentUrl: url });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      paymentLogger.error('Payment initialization failed', { error: error.message });
      setError(error);
      toast.error(`Failed to initialize payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [planId, successUrl, cancelUrl, user?.id]);

  useEffect(() => {
    // No automatic initialization
  }, [initializePayment]);

  return { paymentUrl, loading, error, initializePayment };
};

