
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth/useAuth'; 
import { StorageService } from '@/services/storage/StorageService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import type { ContractData } from '@/lib/contracts/contract-validation-service';

interface IframePaymentSectionProps {
  planId: string;
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

export const IframePaymentSection: React.FC<IframePaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete,
  onBack 
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(PaymentStatusEnum.IDLE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // Determine if we're using token_only mode (for monthly plans)
  const operationType = planId === 'monthly' ? 'token_only' : 'payment';
  
  // Initialize the payment iframe when component mounts
  useEffect(() => {
    const initializePaymentIframe = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPaymentStatus(PaymentStatusEnum.INITIALIZING);
        
        // Get contract data from storage - contains customer info
        const contractData = StorageService.get<ContractData>('contract_data');
        if (!contractData) {
          throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
        }

        if (!contractData.email || !contractData.fullName) {
          throw new Error('חסרים פרטי לקוח בחוזה');
        }

        // Validate phone and idNumber are present
        if (!contractData.phone || !contractData.idNumber) {
          throw new Error('חסרים פרטי טלפון או תעודת זהות בחוזה');
        }

        PaymentLogger.log('Initializing payment iframe for plan', { 
          planId, 
          email: contractData.email,
          fullName: contractData.fullName,
          hasPhone: Boolean(contractData.phone),
          hasIdNumber: Boolean(contractData.idNumber),
          operationType
        });
        
        // Map operation type to CardCom format
        const cardcomOperation = operationType === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly';
        
        // Call the CardCom iframe initialization edge function
        const { data, error } = await supabase.functions.invoke('cardcom-iframe', {
          body: {
            planId,
            userId: user?.id || null,
            email: contractData.email,
            fullName: contractData.fullName,
            phone: contractData.phone,
            idNumber: contractData.idNumber,
            operationType: cardcomOperation
          }
        });
        
        if (error) {
          PaymentLogger.error('Error from cardcom-iframe function:', error);
          throw new Error(`Failed to initialize payment: ${error.message}`);
        }
        
        if (!data?.success || !data?.data) {
          throw new Error(data?.message || 'Invalid response from payment service');
        }
        
        // Find the iframe URL from different possible properties
        const url = data.data.url || data.data.iframeUrl || data.data.Url;
        
        if (!url) {
          throw new Error('No iframe URL provided in the response');
        }
        
        // Set the iframe URL and session ID
        setIframeUrl(url);
        setSessionId(data.data.sessionId);
        setPaymentStatus(PaymentStatusEnum.IDLE);
        
        PaymentLogger.log('Payment iframe initialized successfully', {
          iframeUrl: url,
          sessionId: data.data.sessionId,
          lowProfileId: data.data.lowProfileId || data.data.LowProfileId
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'אירעה שגיאה בהתחברות למערכת התשלומים';
        PaymentLogger.error('Payment iframe initialization error:', error);
        setError(errorMessage);
        setPaymentStatus(PaymentStatusEnum.FAILED);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializePaymentIframe();
    
    return () => {
      // Clean up any polling intervals when unmounting
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [planId, user?.id, operationType]);
  
  // Setup realtime subscription for payment status updates
  useEffect(() => {
    if (!sessionId) return;
    
    const channel = supabase
      .channel('payment-updates')
      .on(
        'broadcast',
        { event: 'payment_status_update' },
        (payload) => {
          if (payload.payload && payload.payload.session_id === sessionId) {
            PaymentLogger.log('Received payment status update via realtime:', payload.payload);
            
            if (payload.payload.status === 'completed') {
              setPaymentStatus(PaymentStatusEnum.SUCCESS);
              toast.success('התשלום בוצע בהצלחה!');
              
              // Clean up polling if it's running
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              
              if (onPaymentComplete) {
                onPaymentComplete();
              }
            } else if (payload.payload.status === 'failed') {
              setPaymentStatus(PaymentStatusEnum.FAILED);
              setError('התשלום נכשל');
              toast.error('התשלום נכשל');
              
              // Clean up polling
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }
        }
      )
      .subscribe();
      
    PaymentLogger.log('Subscribed to payment status updates for session:', sessionId);
    
    return () => {
      // Cleanup subscription
      supabase.removeChannel(channel);
    };
  }, [sessionId, onPaymentComplete]);
  
  // Fallback polling mechanism for payment status updates (in case realtime doesn't work)
  useEffect(() => {
    if (!sessionId || paymentStatus !== PaymentStatusEnum.IDLE) {
      return;
    }
    
    const checkPaymentStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cardcom-status', {
          body: { sessionId }
        });
        
        if (error) {
          PaymentLogger.error('Error checking payment status:', error);
          return;
        }
        
        if (data?.data?.status === 'success' || data?.data?.status === 'completed') {
          PaymentLogger.log('Payment completed successfully (poll)');
          setPaymentStatus(PaymentStatusEnum.SUCCESS);
          toast.success('התשלום בוצע בהצלחה!');
          
          if (onPaymentComplete) {
            onPaymentComplete();
          }
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (data?.data?.status === 'failed') {
          PaymentLogger.log('Payment failed (poll)');
          setPaymentStatus(PaymentStatusEnum.FAILED);
          setError('התשלום נדחה');
          toast.error('התשלום נכשל');
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        PaymentLogger.error('Error in payment status check:', err);
      }
    };
    
    // Check immediately and then every 5 seconds
    checkPaymentStatus();
    
    // Polling interval - check every 6 seconds for a maximum of 2 minutes
    const maxPolls = 20; // 2 minutes (20 * 6 seconds)
    let pollCount = 0;
    
    pollingIntervalRef.current = window.setInterval(() => {
      pollCount++;
      checkPaymentStatus();
      
      // Stop polling after the maximum number of polls
      if (pollCount >= maxPolls) {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        
        // If still in IDLE state after 2 minutes, show a message
        if (paymentStatus === PaymentStatusEnum.IDLE) {
          PaymentLogger.log('Polling timed out, no payment status update received');
          // Don't change status, let the user continue with the payment
          toast.info('אנא השלם את התשלום או נסה שנית מאוחר יותר');
        }
      }
    }, 6000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sessionId, paymentStatus, onPaymentComplete]);
  
  // Handle iframe load events
  const handleIframeLoad = () => {
    PaymentLogger.log('Iframe loaded successfully');
    setIsLoading(false);
  };
  
  // Handle iframe errors
  const handleIframeError = () => {
    PaymentLogger.error('Iframe failed to load');
    setError('נכשל בטעינת טופס התשלום');
    setIsLoading(false);
  };
  
  // Handle retry button click
  const handleRetry = () => {
    setError(null);
    setPaymentStatus(PaymentStatusEnum.IDLE);
    setIsLoading(true);
    window.location.reload();
  };

  // Render different states
  if (paymentStatus === PaymentStatusEnum.SUCCESS) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>התשלום בוצע בהצלחה</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-xl font-medium">תודה!</p>
            <p>התשלום שלך התקבל בהצלחה.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onPaymentComplete}>המשך</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>תשלום מאובטח</CardTitle>
        <CardDescription>הזן את פרטי התשלום בטופס המאובטח</CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>מתחבר למערכת התשלומים...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={handleRetry}>נסה שנית</Button>
          </div>
        ) : iframeUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border overflow-hidden relative w-full" style={{ height: '500px' }}>
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                title="CardCom Payment"
                className="absolute top-0 left-0 w-full h-full"
                style={{ border: 'none' }}
                allow="payment"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              ></iframe>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
              <p>🔒 מערכת התשלום מאובטחת לחלוטין. פרטי כרטיס האשראי שלך אינם נשמרים במערכת.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>טוען את טופס התשלום...</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isLoading || paymentStatus === PaymentStatusEnum.PROCESSING}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            חזרה
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default IframePaymentSection;
