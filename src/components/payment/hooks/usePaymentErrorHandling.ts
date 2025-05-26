import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { savePaymentSession } from '../services/recoveryService';
import { getErrorMessage, mapErrorCode, isTransientError, logPaymentError } from '../utils/errorHandling';
import { useAuth } from '@/contexts/auth/AuthContext';
import { paymentErrorHandler } from '@/services/errors/handlers/paymentErrorHandler';
import { PaymentError } from '@/types/payment';
import { errorTracking } from '@/services/errors/utils/errorTracking';
import { paymentLogger } from '@/services/logging/paymentLogger';

interface UsePaymentErrorHandlingProps {
  planId: string;
  onCardUpdate?: () => void;
  onAlternativePayment?: () => void;
}

export const usePaymentErrorHandling = ({ 
  planId,
  onCardUpdate,
  onAlternativePayment
}: UsePaymentErrorHandlingProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isRecovering, setIsRecovering] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<any>(null);
  
  // Check URL for recovery parameter
  const checkForRecovery = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recoveryId = urlParams.get('recover');
    
    if (recoveryId) {
      setIsRecovering(true);
      setSessionId(recoveryId);
      
      try {
        // Get session data - import dynamically to avoid circular deps
        const { getRecoverySession } = await import('../services/recoveryService');
        const sessionData = await getRecoverySession(recoveryId);
        
        if (!sessionData) {
          toast.error('לא נמצא מידע להשלמת התשלום או שפג תוקף הקישור');
          setIsRecovering(false);
          return;
        }
        
        // Prefill data from session
        return {
          planId: sessionData.plan_id,
          email: sessionData.email,
          paymentDetails: sessionData.payment_details
        };
      } catch (error) {
        console.error('Error recovering session:', error);
        setIsRecovering(false);
      }
    }
    
    return null;
  };
  
  // Handle payment error with recovery
  const handleError = useCallback(async (error: any, paymentDetails?: any) => {
    setLastError(error);
    
    // Create session ID for potential recovery
    const newSessionId = await savePaymentSession({
      userId: user?.id,
      email: user?.email,
      planId,
      paymentDetails
    });
    
    if (newSessionId) {
      setSessionId(newSessionId);
    }
    
    // Process the error
    const errorCode = mapErrorCode(error);
    const errorMessage = getErrorMessage(errorCode);
    
    // Log the error
    const errorInfo = await logPaymentError(
      error, 
      user?.id, 
      'payment-processing', 
      paymentDetails
    );
    
    // Display user-friendly message
    toast.error(errorMessage);
    
    // Handle specific error cases
    switch (errorCode) {
      case 'INSUFFICIENT_FUNDS':
        if (onAlternativePayment) {
          onAlternativePayment();
        }
        break;
        
      case 'EXPIRED_CARD':
        if (onCardUpdate) {
          onCardUpdate();
        }
        break;
        
      case 'SESSION_EXPIRED':
        toast.error('פג תוקף החיבור, אנא התחבר מחדש');
        // Redirect to login page
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1500);
        break;
    }
    
    // Send recovery email for persistent errors
    if (user?.email && user?.id) {
      const { sendRecoveryEmail } = await import('../services/recoveryService');
      sendRecoveryEmail(user.email, errorInfo, newSessionId || sessionId);
    }
    
    return errorInfo;
  }, [user, planId, onCardUpdate, onAlternativePayment]);
  
  return {
    handleError,
    checkForRecovery,
    isRecovering,
    sessionId,
    lastError
  };
};
