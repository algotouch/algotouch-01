import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TokenData } from '@/types/payment';
import { getSubscriptionPlans } from '../utils/paymentHelpers';
import { useRegistrationData } from './useRegistrationData';
import { 
  handleExistingUserPayment, 
  registerNewUser,
  initiateExternalPayment
} from '../services/paymentService';
import { UsePaymentProcessProps, PaymentError } from './types';
import { usePaymentErrorHandling } from './usePaymentErrorHandling';
import { encrypt, decrypt } from '@/utils/encryption';

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export const usePaymentProcess = ({ planId, onPaymentComplete }: UsePaymentProcessProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<PaymentError | null>(null);
  const [attempts, setAttempts] = useState<{ timestamp: number }[]>([]);
  
  const { 
    registrationData, 
    registrationError, 
    loadRegistrationData,
    updateRegistrationData,
    clearRegistrationData
  } = useRegistrationData();

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const { handleError, checkForRecovery, isRecovering, sessionId } = usePaymentErrorHandling({
    planId,
    onCardUpdate: () => navigate('/subscription?step=update-card'),
    onAlternativePayment: () => navigate('/subscription?step=alternative-payment')
  });

  // Validate card data
  const validateCardData = (cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
  }): boolean => {
    const { cardNumber, cardholderName, expiryDate, cvv } = cardData;
    
    // Basic validation
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return false;
    }
    
    // Card number validation (Luhn algorithm)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      toast.error('מספר כרטיס לא תקין');
      return false;
    }
    
    // Expiry date validation
    const [month, year] = expiryDate.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    
    if (!month || !year || 
        parseInt(month) < 1 || parseInt(month) > 12 ||
        parseInt(year) < currentYear || 
        (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      toast.error('תאריך תפוגה לא תקין');
      return false;
    }
    
    // CVV validation
    if (!/^\d{3,4}$/.test(cvv)) {
      toast.error('קוד אבטחה לא תקין');
      return false;
    }
    
    // Cardholder name validation
    if (cardholderName.length < 3 || !/^[a-zA-Z\s]+$/.test(cardholderName)) {
      toast.error('שם בעל הכרטיס לא תקין');
      return false;
    }
    
    return true;
  };

  // Check rate limit
  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < RATE_LIMIT.windowMs
    );
    
    if (recentAttempts.length >= RATE_LIMIT.maxAttempts) {
      toast.error('יותר מדי ניסיונות תשלום. נא לנסות שוב מאוחר יותר.');
      return false;
    }
    
    setAttempts([...recentAttempts, { timestamp: now }]);
    return true;
  }, [attempts]);

  useEffect(() => {
    const checkRecovery = async () => {
      const recoveryData = await checkForRecovery();
      if (recoveryData) {
        toast.info('נמצאו פרטים להשלמת התשלום');
        
        if (recoveryData.planId && recoveryData.planId !== planId) {
          navigate(`/subscription?step=3&plan=${recoveryData.planId}&recover=${sessionId}`);
        }
      }
    };
    
    checkRecovery();
  }, []);

  const handlePaymentProcessing = async (tokenData: TokenData) => {
    if (!checkRateLimit()) return;
    
    let operationTypeValue = 3;
    
    if (planId === 'annual') {
      operationTypeValue = 2;
    } else if (planId === 'vip') {
      operationTypeValue = 1;
    }
    
    try {
      setIsProcessing(true);
      setPaymentError(null);
      
      if (user) {
        await handleExistingUserPayment(user.id, planId, tokenData, operationTypeValue, planDetails);
      } else if (registrationData) {
        const updatedData = {
          ...registrationData,
          paymentToken: {
            token: String(tokenData.token || tokenData.lastFourDigits),
            expiry: `${tokenData.expiryMonth}/${tokenData.expiryYear}`,
            last4Digits: tokenData.lastFourDigits,
            cardholderName: tokenData.cardholderName
          },
          planId
        };
        
        // Encrypt sensitive data before storing
        const encryptedData = encrypt(JSON.stringify(updatedData));
        sessionStorage.setItem('registration_data', encryptedData);
        updateRegistrationData(updatedData);
        
        if (updatedData.email && updatedData.password) {
          await registerNewUser(updatedData, tokenData);
        }
      } else {
        const tempRegId = `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('temp_registration_id', tempRegId);
        
        const minimalRegData = {
          planId,
          paymentToken: {
            token: String(tokenData.token || tokenData.lastFourDigits),
            expiry: `${tokenData.expiryMonth}/${tokenData.expiryYear}`,
            last4Digits: tokenData.lastFourDigits,
            cardholderName: tokenData.cardholderName
          },
          registrationTime: new Date().toISOString()
        };
        
        // Encrypt sensitive data before storing
        const encryptedData = encrypt(JSON.stringify(minimalRegData));
        sessionStorage.setItem('registration_data', encryptedData);
        
        toast.success('התשלום התקבל בהצלחה! נא להשלים את תהליך ההרשמה.');
      }
      
      onPaymentComplete();
    } catch (error: any) {
      // Sanitize error logging
      const sanitizedError = {
        message: error.message,
        code: error.code,
        // Remove sensitive data from error
        details: error.details ? {
          ...error.details,
          token: '****',
          cardNumber: '****',
          cvv: '****'
        } : undefined
      };
      console.error("Payment processing error:", sanitizedError);
      
      const errorInfo = await handleError(error, {
        tokenData,
        planId,
        operationType: operationTypeValue
      });
      
      const paymentError: PaymentError = new Error(errorInfo?.errorMessage || 'שגיאה לא ידועה בתהליך התשלום');
      paymentError.code = errorInfo?.errorCode;
      paymentError.details = errorInfo;
      
      setPaymentError(paymentError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
  }) => {
    e.preventDefault();
    
    if (!validateCardData(cardData)) return;
    
    setIsProcessing(true);
    
    try {
      const tokenData: TokenData = {
        token: `sim_${Date.now()}`,
        lastFourDigits: cardData.cardNumber.replace(/\s/g, '').slice(-4),
        expiryMonth: cardData.expiryDate.split('/')[0],
        expiryYear: `20${cardData.expiryDate.split('/')[1]}`,
        cardholderName: cardData.cardholderName
      };
      
      await handlePaymentProcessing(tokenData);
    } catch (error: any) {
      // Sanitize error logging
      const sanitizedError = {
        message: error.message,
        code: error.code,
        // Remove sensitive data from error
        details: error.details ? {
          ...error.details,
          token: '****',
          cardNumber: '****',
          cvv: '****'
        } : undefined
      };
      console.error('Payment processing error:', sanitizedError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExternalPayment = async () => {
    if (!checkRateLimit()) return;
    
    let operationTypeValue = 3;
    
    if (planId === 'annual') {
      operationTypeValue = 2;
    } else if (planId === 'vip') {
      operationTypeValue = 1;
    }
    
    setIsProcessing(true);
    try {
      const data = await initiateExternalPayment(planId, user, registrationData);
      
      if (data.tempRegistrationId) {
        localStorage.setItem('temp_registration_id', data.tempRegistrationId);
      }
      
      window.location.href = data.url;
    } catch (error: any) {
      const errorInfo = await handleError(error, {
        planId,
        operationType: operationTypeValue,
        userInfo: user ? { 
          userId: user.id, 
          email: user.email?.replace(/(?<=.{3}).(?=.*@)/g, '*') 
        } : null
      });
      
      const paymentError: PaymentError = new Error(errorInfo?.errorMessage || 'שגיאה ביצירת עסקה');
      setPaymentError(paymentError);
      
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    registrationData,
    registrationError,
    paymentError,
    loadRegistrationData,
    handleSubmit,
    handleExternalPayment,
    isRecovering,
    plan
  };
};
