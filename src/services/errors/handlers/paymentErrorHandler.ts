
import { toast } from 'sonner';
import { logError } from '../utils/errorTracking';
import { ERROR_CODES, mapErrorCode } from '@/components/payment/utils/errorHandling';

/**
 * Handles payment errors
 */
export const handlePaymentError = async (
  error: any, 
  userId?: string,
  context: string = 'payment',
  options?: {
    showToast?: boolean;
    redirectTo?: string;
    onError?: (error: any) => void;
    retryAction?: () => Promise<any>;
    retryAttempt?: number;
    maxRetries?: number;
  }
): Promise<any> => {
  const showToast = options?.showToast ?? true;
  const errorCode = mapErrorCode(error);
  const errorMessage = ERROR_CODES[errorCode] || ERROR_CODES.UNKNOWN_ERROR;
  
  // Log the error
  await logError({
    category: 'payment',
    action: context,
    error: {
      ...error,
      code: errorCode,
      mappedMessage: errorMessage
    },
    userId
  });
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(errorMessage);
  }
  
  // Handle session expiration
  if (errorCode === 'SESSION_EXPIRED') {
    toast.error('פג תוקף החיבור, אנא התחבר מחדש');
    setTimeout(() => {
      window.location.href = '/auth';
    }, 1500);
    return {
      success: false,
      error,
      message: errorMessage,
      code: errorCode
    };
  }
  
  // Handle retry logic
  const retryAttempt = options?.retryAttempt || 1;
  const maxRetries = options?.maxRetries || 3;
  if (options?.retryAction && retryAttempt <= maxRetries) {
    const delay = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
    toast.warning(`מנסה שנית... ניסיון ${retryAttempt} מתוך ${maxRetries}`);
    
    setTimeout(async () => {
      try {
        await options.retryAction();
      } catch (retryError) {
        await handlePaymentError(retryError, userId, context, {
          ...options,
          retryAttempt: retryAttempt + 1
        });
      }
    }, delay);
  }
  
  // Redirect if specified
  if (options?.redirectTo) {
    setTimeout(() => {
      window.location.href = options.redirectTo!;
    }, 1500);
  }
  
  // Call custom error handler if provided
  if (options?.onError) {
    options.onError(error);
  }
  
  return {
    success: false,
    error,
    message: errorMessage,
    code: errorCode
  };
};
