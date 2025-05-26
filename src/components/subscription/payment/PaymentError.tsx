
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

interface SubscriptionPaymentErrorProps {
  onRetry: () => void;
  onBack: () => void;
  error?: string;
}

const SubscriptionPaymentError: React.FC<SubscriptionPaymentErrorProps> = ({ 
  onRetry, 
  onBack, 
  error 
}) => {
  return (
    <div className="max-w-lg mx-auto mt-8">
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">שגיאה בתהליך התשלום</CardTitle>
          </div>
          <CardDescription>
            אירעה שגיאה ביצירת הקישור לתשלום
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive font-medium">פרטי השגיאה:</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            אנא נסה שנית או חזור לבחירת התוכנית
          </p>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              נסה שנית
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              חזור לבחירת תוכנית
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPaymentError;
