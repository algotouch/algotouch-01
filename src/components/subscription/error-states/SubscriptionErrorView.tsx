
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import SubscriptionCard from '@/components/subscription/SubscriptionCard';
import { useAuth } from '@/contexts/auth';
import SubscriptionManager from '@/components/payment/SubscriptionManager';

interface SubscriptionErrorViewProps {
  error: string;
  onRetry?: () => void;
  retryCount?: number;
}

const SubscriptionErrorView: React.FC<SubscriptionErrorViewProps> = ({ 
  error, 
  onRetry,
  retryCount = 0
}) => {
  const { user } = useAuth();

  return (
    <SubscriptionCard 
      title="שגיאה בטעינת פרטי המנוי" 
      description="אירעה שגיאה בטעינת פרטי המנוי"
    >
      <div className="p-6 space-y-4">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'לא ניתן לטעון את פרטי המנוי'}
          </AlertDescription>
        </Alert>
        
        {user?.email && (
          <div className="border-t pt-4">
            <SubscriptionManager 
              userId={user.id} 
              email={user.email}
              showRepairSuggestion={true}
              onComplete={onRetry}
            />
          </div>
        )}
        
        {onRetry && (
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={onRetry}
              className="flex items-center gap-2"
              variant={user?.email ? "outline" : "default"}
            >
              <RefreshCw className="h-4 w-4" />
              נסה שוב
            </Button>
          </div>
        )}
        
        {retryCount > 2 && (
          <div className="text-center text-sm text-red-500 pt-2">
            <p>נסיונות רבים נכשלו. אנא צור קשר עם התמיכה.</p>
          </div>
        )}
      </div>
    </SubscriptionCard>
  );
};

export default SubscriptionErrorView;
