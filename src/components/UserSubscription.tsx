import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useSubscriptionActions } from '@/services/subscription';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const UserSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  
  const {
    subscription,
    details,
    status,
    refreshSubscription
  } = useSubscriptionActions({ userId });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    if (userId) {
      setIsRefreshing(true);
      refreshSubscription()
        .finally(() => setIsRefreshing(false));
    }
  }, [userId, refreshSubscription]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSubscription();
    setIsRefreshing(false);
    toast.success('Subscription data refreshed');
  };
  
  const handleManageSubscription = () => {
    navigate('/subscription');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטי מנוי</CardTitle>
        <CardDescription>סקירה כללית של המנוי הנוכחי שלך</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.loading && !subscription ? (
          <div className="text-center">טוען פרטי מנוי...</div>
        ) : subscription ? (
          <>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Badge variant="secondary">{subscription.plan_name}</Badge>
              <span className="text-sm text-muted-foreground">
                {subscription.status === 'active' ? 'פעיל' : 'לא פעיל'}
              </span>
            </div>
            
            <Separator />
            
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-sm font-semibold">תאריך התחלה</div>
                  <div className="text-muted-foreground">
                    {new Date(subscription.start_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold">תאריך סיום</div>
                  <div className="text-muted-foreground">
                    {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'בתוקף'}
                  </div>
                </div>
              </div>
              
              {details?.cancellation && (
                <div className="grid gap-1">
                  <div className="text-sm font-semibold">סיבת ביטול</div>
                  <div className="text-muted-foreground">{details.cancellation.reason}</div>
                  
                  {details.cancellation.feedback && (
                    <>
                      <div className="text-sm font-semibold">משוב נוסף</div>
                      <div className="text-muted-foreground">{details.cancellation.feedback}</div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <Button variant="secondary" onClick={handleManageSubscription}>
                <CreditCard className="w-4 h-4 mr-2" />
                נהל מנוי
              </Button>
              
              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    טוען...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    רענן נתונים
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            {status.error ? (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                אירעה שגיאה בטעינת פרטי המנוי. נסה שוב מאוחר יותר.
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                אין לך מנוי פעיל כרגע.
              </>
            )}
            
            <Button variant="link" onClick={() => navigate('/subscription')}>
              לרכישת מנוי
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserSubscription;
