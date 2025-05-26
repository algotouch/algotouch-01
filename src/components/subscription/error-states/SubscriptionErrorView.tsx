import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthContext';

interface SubscriptionErrorViewProps {
  onRetry: () => void;
  onBack: () => void;
  message?: string;
}

const SubscriptionErrorView: React.FC<SubscriptionErrorViewProps> = ({ onRetry, onBack, message }) => {
  const { clearRegistrationData } = useAuth();
  
  const handleClearAndBack = () => {
    clearRegistrationData();
    onBack();
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>שגיאה</CardTitle>
        <CardDescription>אירעה שגיאה במהלך ההרשמה</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {message || "אירעה שגיאה לא צפויה. אנא נסה שוב או צור קשר עם התמיכה."}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col space-y-2">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            נסה שוב
          </Button>
          <Button variant="secondary" onClick={handleClearAndBack}>
            <ArrowRight className="h-4 w-4 mr-2" />
            חזרה לדף הבית
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionErrorView;

