import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth/AuthContext';

const PaymentHandling = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  
  const sessionId = searchParams.get('session_id');
  const paymentType = searchParams.get('payment_type') || 'subscription';

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is missing.');
      setLoading(false);
      return;
    }

    const checkPaymentStatus = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/payment/check-status?session_id=${sessionId}`);
        const data = await response.json();

        if (data.paymentStatus === 'paid') {
          // Payment successful
          console.log('Payment successful, navigating to success page');
          navigate('/payment/success');
        } else {
          // Payment failed or pending
          console.error('Payment failed or pending:', data.error);
          setError(data.error || 'Payment failed.');
          navigate('/payment/failed');
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
        setError('Failed to check payment status.');
        navigate('/payment/failed');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [sessionId, navigate, session]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Processing Payment</CardTitle>
          <CardDescription>Please wait while we verify your payment...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {loading ? (
            <>
              <Spinner size="lg" />
              <p>Verifying payment status...</p>
            </>
          ) : error ? (
            <>
              <p className="text-red-500">Error: {error}</p>
              <Button onClick={() => navigate('/subscription')}>Return to Subscription</Button>
            </>
          ) : (
            <p>Redirecting...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHandling;
