
import React, { useState, useEffect } from 'react';
import { CardContent } from '@/components/ui/card';
import { Shield, ShieldCheck, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentIframeProps {
  paymentUrl: string | null;
  onSuccess?: (paymentData: any) => void;
  onError?: (error: Error) => void;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({ 
  paymentUrl, 
  onSuccess, 
  onError 
}) => {
  const [iframeHeight, setIframeHeight] = useState(700);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIframeHeight(750);
      } else {
        setIframeHeight(700);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for navigation events that indicate payment completion
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'payment_success_data' && e.newValue) {
        try {
          const paymentData = JSON.parse(e.newValue);
          console.log('Payment completed via storage event:', paymentData);
          toast.success('התשלום התקבל בהצלחה!');
          
          if (onSuccess) {
            onSuccess(paymentData);
          }
        } catch (error) {
          console.error('Error parsing payment success data:', error);
        }
      }
    };

    // Listen for cross-window communication
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from iframe:', event.data);
      
      if (event.data?.type === 'payment-success') {
        console.log('Payment successful:', event.data.details);
        toast.success('התשלום התקבל בהצלחה!');
        
        if (onSuccess) {
          onSuccess(event.data.details);
        }
      } else if (event.data?.type === 'payment-error') {
        console.error('Payment error:', event.data.message);
        toast.error('שגיאה בתהליך התשלום: ' + (event.data.message || 'אנא נסה שנית'));
        
        if (onError) {
          onError(new Error(event.data.message || 'Payment failed'));
        }
      }
    };

    // Check for payment completion periodically
    const checkPaymentStatus = () => {
      const paymentData = sessionStorage.getItem('payment_success_data');
      if (paymentData) {
        try {
          const data = JSON.parse(paymentData);
          console.log('Payment completion detected:', data);
          toast.success('התשלום התקבל בהצלחה!');
          
          // Clear the data to prevent multiple triggers
          sessionStorage.removeItem('payment_success_data');
          
          if (onSuccess) {
            onSuccess(data);
          }
        } catch (error) {
          console.error('Error parsing payment data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);
    
    // Check every 2 seconds for payment completion
    const checkInterval = setInterval(checkPaymentStatus, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
      clearInterval(checkInterval);
    };
  }, [onSuccess, onError]);

  if (!paymentUrl) return null;

  return (
    <CardContent className="p-0">
      <div className="relative">
        {/* Payment form title */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">טופס תשלום מאובטח</h3>
          </div>
          
          {/* Security badges */}
          <div className="flex flex-wrap gap-3 items-center mb-2">
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs border border-green-200 dark:border-green-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>SSL מאובטח</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900/30">
              <CreditCard className="h-3 w-3" />
              <span>תשלום מוצפן</span>
            </div>
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-200 dark:border-purple-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>PCI DSS</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced iframe container */}
        <div className="relative bg-gradient-to-b from-primary/5 to-transparent p-4 sm:p-6">
          <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/5 pointer-events-none"></div>
            <iframe 
              src={paymentUrl}
              width="100%"
              height={iframeHeight}
              frameBorder="0"
              title="Cardcom Payment Form"
              className="w-full"
              allow="payment"
              sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
            />
          </div>
        </div>
      </div>
    </CardContent>
  );
};

export default PaymentIframe;
