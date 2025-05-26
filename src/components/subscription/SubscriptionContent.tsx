import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, CreditCard, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useSubscriptionFlow } from './hooks/useSubscriptionFlow';
import { LoadingSkeleton } from './error-states/LoadingSkeleton';
import { NoSubscriptionState } from './error-states/NoSubscriptionState';
import { SubscriptionErrorView } from './error-states/SubscriptionErrorView';
import { ContractSection } from './ContractSection';
import { PaymentSection } from './payment/PaymentSection';
import { CompletionView } from './views/CompletionView';
import { ContractView } from './views/ContractView';

const SubscriptionContent = () => {
  const { user, isAuthenticated, registrationData, pendingSubscription } = useAuth();
  const {
    subscription,
    details,
    stage,
    loading,
    error,
    startSubscription,
    handleContractAcceptance,
    handlePaymentSuccess,
    handlePaymentError,
    retrySubscription,
    resetFlow
  } = useSubscriptionFlow();
  
  const hasValidAccess = isAuthenticated || (registrationData && pendingSubscription);
  
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load subscription data');
    }
  }, [error]);
  
  if (!hasValidAccess) {
    return (
      <Card className="glass-card-2025">
        <CardHeader>
          <CardTitle>גישה מוגבלת</CardTitle>
          <CardDescription>עליך להיות מנוי כדי לגשת לתוכן זה</CardDescription>
        </CardHeader>
        <CardContent>
          <p>אנא הירשם או התחבר כדי להמשיך</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <SubscriptionErrorView onRetry={retrySubscription} />;
  }

  if (!subscription) {
    return <NoSubscriptionState onStart={startSubscription} />;
  }
  
  return (
    <div className="space-y-6">
      {stage === 'contract' && (
        <ContractView onAccept={handleContractAcceptance} />
      )}
      
      {stage === 'payment' && (
        <PaymentSection 
          onSuccess={handlePaymentSuccess} 
          onError={handlePaymentError} 
        />
      )}
      
      {stage === 'complete' && (
        <CompletionView onComplete={resetFlow} />
      )}
      
      {stage === 'view' && (
        <Card className="glass-card-2025">
          <CardHeader>
            <CardTitle>פרטי המנוי שלך</CardTitle>
            <CardDescription>סקירה של המנוי הנוכחי שלך</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p><strong>סטטוס:</strong> {details?.statusText}</p>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <p><strong>תכנית:</strong> {details?.planName}</p>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Calendar className="h-4 w-4 text-yellow-500" />
              <p><strong>תאריך חידוש:</strong> {details?.renewalDateText}</p>
            </div>
            <Separator />
            <ContractSection />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionContent;
