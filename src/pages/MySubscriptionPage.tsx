
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth';
import { useSubscription } from '@/hooks/useSubscription';
import { AlertCircle, Calendar, CreditCard, Settings, X, CheckCircle, Clock, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { getPlanDetails, getNextChargeDate } from '@/components/subscription/payment/PlanUtilities';

const MySubscriptionPage = () => {
  const { user } = useAuth();
  const { 
    subscription, 
    loading, 
    error, 
    cancelSubscription, 
    reactivateSubscription,
    refreshSubscription 
  } = useSubscription();
  
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (user?.id) {
      refreshSubscription();
    }
  }, [user?.id]);

  const handleCancelSubscription = async () => {
    if (!cancelReason.trim()) {
      toast.error('נא לציין סיבת הביטול');
      return;
    }

    setIsCancelling(true);
    try {
      const success = await cancelSubscription(cancelReason);
      if (success) {
        toast.success('המנוי בוטל בהצלחה');
        setShowCancelDialog(false);
        setCancelReason('');
        await refreshSubscription();
      }
    } catch (error) {
      toast.error('שגיאה בביטול המנוי');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsReactivating(true);
    try {
      const success = await reactivateSubscription();
      if (success) {
        toast.success('המנוי הופעל מחדש בהצלחה');
        await refreshSubscription();
      }
    } catch (error) {
      toast.error('שגיאה בהפעלת המנוי מחדש');
    } finally {
      setIsReactivating(false);
    }
  };

  const getStatusBadge = (status: string, isCancelled: boolean) => {
    if (isCancelled) {
      return <Badge variant="destructive">מבוטל</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">פעיל</Badge>;
      case 'trial':
        return <Badge className="bg-blue-500 text-white">תקופת ניסיון</Badge>;
      case 'expired':
        return <Badge variant="destructive">פג תוקף</Badge>;
      case 'suspended':
        return <Badge variant="outline">מושעה</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'vip':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'annual':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'monthly':
        return <Clock className="h-5 w-5 text-green-500" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Spinner size="lg" />
            <p className="text-muted-foreground">טוען נתוני מנוי...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  if (!subscription) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>אין מנוי פעיל</CardTitle>
              <CardDescription>נראה שאין לך מנוי פעיל במערכת</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.href = '/subscription'}>
                רכוש מנוי
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const planDetails = getPlanDetails(subscription.plan_type || 'monthly');
  const isCancelled = subscription.cancelled_at !== null;
  const nextChargeDate = getNextChargeDate(subscription.plan_type || 'monthly');
  const trialEndsAt = subscription.trial_ends_at ? parseISO(subscription.trial_ends_at) : null;
  const isInTrial = subscription.status === 'trial' && trialEndsAt && trialEndsAt > new Date();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">המנוי שלי</h1>
          <Button 
            onClick={() => refreshSubscription()} 
            variant="outline"
            disabled={loading}
          >
            רענן נתונים
          </Button>
        </div>

        {/* Subscription Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getPlanIcon(subscription.plan_type || 'monthly')}
                <CardTitle>{planDetails.name}</CardTitle>
              </div>
              {getStatusBadge(subscription.status || 'unknown', isCancelled)}
            </div>
            <CardDescription>
              {planDetails.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground">מחיר</h4>
                <p className="text-2xl font-bold">{planDetails.price}</p>
              </div>
              
              {isInTrial && trialEndsAt && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">תקופת הניסיון מסתיימת</h4>
                  <p className="text-lg font-semibold text-blue-600">
                    {format(trialEndsAt, 'dd/MM/yyyy', { locale: he })}
                  </p>
                </div>
              )}
              
              {nextChargeDate && !isCancelled && subscription.plan_type !== 'vip' && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">החיוב הבא</h4>
                  <p className="text-lg font-semibold">
                    {format(nextChargeDate, 'dd/MM/yyyy', { locale: he })}
                  </p>
                </div>
              )}

              {subscription.plan_type === 'vip' && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">סוג מנוי</h4>
                  <p className="text-lg font-semibold text-yellow-600">לכל החיים</p>
                </div>
              )}
            </div>

            {isCancelled && subscription.cancelled_at && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  המנוי בוטל ב-{format(parseISO(subscription.cancelled_at), 'dd/MM/yyyy', { locale: he })}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              פרטי תשלום
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription.token ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">אמצעי תשלום רשום</p>
                <p>**** **** **** {subscription.payment_method?.last4 || '****'}</p>
                {subscription.token_expires_ym && (
                  <p className="text-sm text-muted-foreground">
                    תוקף: {subscription.token_expires_ym}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">אין אמצעי תשלום רשום</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>פעולות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {!isCancelled && subscription.plan_type !== 'vip' && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isCancelling}
                >
                  בטל מנוי
                </Button>
              )}
              
              {isCancelled && subscription.plan_type !== 'vip' && (
                <Button 
                  onClick={handleReactivateSubscription}
                  disabled={isReactivating}
                >
                  {isReactivating ? 'מפעיל מחדש...' : 'הפעל מנוי מחדש'}
                </Button>
              )}
              
              <Button variant="outline" onClick={() => window.location.href = '/subscription'}>
                שדרג מנוי
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cancel Dialog */}
        {showCancelDialog && (
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-red-600">ביטול מנוי</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCancelDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>אנא ספר לנו מדוע אתה מבטל את המנוי:</p>
              <textarea
                className="w-full p-3 border rounded-md min-h-[100px]"
                placeholder="הסיבה לביטול..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button 
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? 'מבטל...' : 'אשר ביטול'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowCancelDialog(false)}
                >
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default MySubscriptionPage;
