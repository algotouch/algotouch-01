
import React from 'react';
import PaymentError from '@/components/payment/PaymentError';

interface SubscriptionPaymentErrorProps {
  onRetry: () => void;
  onBack: () => void;
}

const SubscriptionPaymentError: React.FC<SubscriptionPaymentErrorProps> = ({ onRetry, onBack }) => {
  return (
    <div className="max-w-3xl mx-auto">
      <PaymentError
        message="שגיאה בהכנת מסך התשלום"
        onRetry={onRetry}
        onBack={onBack}
      />
    </div>
  );
};

export default SubscriptionPaymentError;
