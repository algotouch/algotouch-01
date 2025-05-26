import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CreditCard, Lock, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePaymentProcess } from './hooks/usePaymentProcess';
import { usePaymentErrorHandling } from './hooks/usePaymentErrorHandling';
import { useUnifiedRegistrationData } from '@/hooks/useUnifiedRegistrationData';

interface PaymentFormProps {
  planId: string;
  amount: number;
  currency: string;
  onSuccess: (paymentDetails: any) => void;
  onCancel: () => void;
  onError: (error: Error) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, amount, currency, onSuccess, onCancel, onError }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const { registrationData } = useUnifiedRegistrationData();
  const { initializePayment, processPayment, paymentStatus, paymentError, clearPaymentError } = usePaymentProcess({
    planId,
    amount,
    currency,
    onSuccess,
    onError
  });
  const { handlePaymentError } = usePaymentErrorHandling();
  
  const isPaymentInitialized = paymentStatus.initialized;
  const isProcessingPayment = paymentStatus.processing;
  
  // Initialize payment when the component mounts
  useEffect(() => {
    setIsMounted(true);
    initializePayment();
    
    return () => {
      setIsMounted(false);
    };
  }, [initializePayment]);
  
  // Handle payment errors
  useEffect(() => {
    if (paymentError) {
      handlePaymentError(paymentError);
      clearPaymentError();
    }
  }, [paymentError, handlePaymentError, clearPaymentError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      toast.error('אנא אשר את תנאי השימוש');
      return;
    }
    
    if (!cardNumber || !cardExpiry || !cardCvc || !cardHolderName) {
      toast.error('אנא מלא את כל פרטי התשלום');
      return;
    }
    
    const paymentData = {
      paymentMethod,
      cardNumber,
      cardExpiry,
      cardCvc,
      cardHolderName,
      saveCard,
      termsAccepted,
      email: registrationData?.email,
      firstName: registrationData?.userData?.firstName,
      lastName: registrationData?.userData?.lastName,
      phone: registrationData?.userData?.phone
    };
    
    processPayment(paymentData);
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>פרטי תשלום</CardTitle>
        <CardDescription>הזן את פרטי התשלום שלך</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {paymentStatus.initializationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {paymentStatus.initializationError.message || 'אירעה שגיאה בהכנת התשלום. אנא נסה שוב מאוחר יותר.'}
            </AlertDescription>
          </Alert>
        )}
        
        {!isPaymentInitialized && !paymentStatus.initializationError && (
          <div className="flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}
        
        {isPaymentInitialized && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardHolderName">שם בעל הכרטיס</Label>
              <Input 
                type="text" 
                id="cardHolderName" 
                placeholder="השם שלך כפי שמופיע בכרטיס" 
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cardNumber">מספר כרטיס האשראי</Label>
              <Input 
                type="text" 
                id="cardNumber" 
                placeholder="**** **** **** ****" 
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardExpiry">תוקף</Label>
                <Input 
                  type="text" 
                  id="cardExpiry" 
                  placeholder="MM/YY" 
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardCvc">CVC</Label>
                <Input 
                  type="text" 
                  id="cardCvc" 
                  placeholder="***" 
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked || false)}
              />
              <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed">
                אני מאשר את <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">תנאי השימוש</a>
              </Label>
            </div>
            
            <Button type="submit" className="w-full" disabled={isProcessingPayment}>
              {isProcessingPayment ? 'מעבד תשלום...' : 'שלם עכשיו'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentForm;
