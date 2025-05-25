
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { createTokenData } from './utils/paymentHelpers';
import { registerUser } from '@/services/registration/registerUser';
import { useUnifiedRegistrationData } from '@/hooks/useUnifiedRegistrationData';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const navigate = useNavigate();
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  
  const {
    registrationData,
    registrationError,
    updateRegistrationData,
    clearRegistrationData,
    isLoading
  } = useUnifiedRegistrationData();

  useEffect(() => {
    if (isLoading) return;
    
    if (!registrationData) {
      toast.error('נתוני הרשמה חסרים, אנא חזור לדף ההרשמה');
      navigate('/auth?tab=signup');
      return;
    }
    
    if (registrationData.userData?.firstName && registrationData.userData?.lastName && !cardholderName) {
      setCardholderName(`${registrationData.userData.firstName} ${registrationData.userData.lastName}`);
    }
    
    const storedRegId = localStorage.getItem('temp_registration_id');
    if (storedRegId) {
      setRegistrationId(storedRegId);
    }
  }, [registrationData, isLoading, cardholderName, navigate]);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' ? planDetails.annual : planDetails.monthly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    if (!registrationData) {
      toast.error('נתוני ההרשמה חסרים, אנא התחל את תהליך ההרשמה מחדש');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const tokenData = createTokenData(cardNumber, expiryDate, cardholderName);
      
      // Update registration data with token information - ensure token is a string
      updateRegistrationData({
        paymentToken: {
          token: String(tokenData.token || `sim_${Date.now()}`), // Ensure it's a string
          last4Digits: tokenData.lastFourDigits,
          expiry: `${tokenData.expiryMonth}/${tokenData.expiryYear}`,
          cardholderName: tokenData.cardholderName
        }
      });
      
      const result = await registerUser({
        registrationData,
        tokenData
      });
      
      if (!result.success) {
        throw result.error;
      }
      
      if (result.registrationId) {
        localStorage.setItem('temp_registration_id', result.registrationId);
        setRegistrationId(result.registrationId);
      }
      
      toast.success('התשלום נקלט בהצלחה! נרשמת לתקופת ניסיון חינם');
      
      clearRegistrationData();
      
      onPaymentComplete();
    } catch (error: any) {
      console.error('Payment/registration error:', error);
      setPaymentError(error.message || 'אירעה שגיאה בתהליך ההרשמה. נסה שנית מאוחר יותר.');
      toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה. נסה שנית מאוחר יותר.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (registrationError) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center">שגיאה בתהליך ההרשמה</CardTitle>
          <CardDescription className="text-center">לא ניתן להמשיך את תהליך ההרשמה</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {registrationError}
            </AlertDescription>
          </Alert>
          <p className="text-center">
            אנא נסה להתחיל את תהליך ההרשמה מחדש
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => navigate('/auth?tab=signup')}>
            חזרה לעמוד ההרשמה
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>הזן את פרטי כרטיס האשראי שלך לתשלום</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {paymentError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{paymentError}</AlertDescription>
            </Alert>
          )}
          
          {registrationId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800 text-sm">
              <p className="font-medium">מזהה רישום זמני: {registrationId}</p>
              <p className="text-xs text-muted-foreground">שמור מזהה זה במקרה של בעיות בתהליך ההרשמה</p>
            </div>
          )}
          
          <PlanSummary 
            planName={plan.name} 
            price={plan.price} 
            description={plan.description} 
          />
          
          <Separator />
          
          <PaymentDetails 
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            cardholderName={cardholderName}
            setCardholderName={setCardholderName}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            cvv={cvv}
            setCvv={setCvv}
          />
          
          <SecurityNote />
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? 'מעבד תשלום והרשמה...' : 'סיים הרשמה לתקופת ניסיון חינם'}
          </Button>
          <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
            לחיצה על כפתור זה מאשרת את פרטי התשלום לחיוב אוטומטי לאחר תקופת הניסיון
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PaymentForm;
