import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface SubscriptionDetails {
  status: string;
  current_period_ends_at: string;
  payment_details: {
    card_info: {
      last4: string;
      expiry: string;
      card_type: string;
    };
  };
}

interface PaymentLog {
  amount: number;
  status: string;
  created_at: string;
  payment_data: {
    operation: string;
    card_info: {
      last4: string;
    };
  };
  transaction_id?: string;
  receipt_url?: string;
}

interface DatabaseSubscription {
  status: string | null;
  current_period_ends_at: string | null;
  payment_details: Json;
}

interface DatabasePaymentLog {
  amount: number;
  status: string;
  created_at: string | null;
  payment_data: Json;
  transaction_id?: string;
  receipt_url?: string;
}

export const SubscriptionDetails: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchSubscriptionDetails();
      fetchPaymentLogs();
    }
  }, [user]);

  const fetchSubscriptionDetails = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found
          setSubscription(null);
          setInitError('לא נמצא מנוי פעיל');
          return;
        }
        throw error;
      }
      
      if (data) {
        const dbSubscription = data as unknown as DatabaseSubscription;
        const paymentDetails = dbSubscription.payment_details as any;
        
        // Validate subscription data
        if (!dbSubscription.status || !dbSubscription.current_period_ends_at) {
          console.error('Invalid subscription data:', dbSubscription);
          toast.error('שגיאה בנתוני המנוי');
          setInitError('שגיאה בנתוני המנוי');
          return;
        }

        setSubscription({
          status: dbSubscription.status,
          current_period_ends_at: dbSubscription.current_period_ends_at,
          payment_details: {
            card_info: {
              last4: paymentDetails?.card_info?.last4 || '',
              expiry: paymentDetails?.card_info?.expiry || '',
              card_type: paymentDetails?.card_info?.card_type || ''
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('שגיאה בטעינת פרטי המנוי');
      setInitError('שגיאה בטעינת פרטי המנוי');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentLogs = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_payment_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const dbLogs = data as DatabasePaymentLog[];
        const validLogs = dbLogs.map(log => {
          const paymentData = log.payment_data as any;
          return {
            amount: log.amount || 0,
            status: log.status || 'unknown',
            created_at: log.created_at || new Date().toISOString(),
            payment_data: {
              operation: paymentData?.operation || '',
              card_info: {
                last4: paymentData?.card_info?.last4 || ''
              }
            },
            transaction_id: log.transaction_id || '',
            receipt_url: log.receipt_url || ''
          };
        }).filter(log => log.amount > 0); // Filter out invalid logs

        setPaymentLogs(validLogs);
      }
    } catch (error) {
      console.error('Error fetching payment logs:', error);
      toast.error('שגיאה בטעינת היסטוריית התשלומים');
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    
    const confirmMessage = subscription?.status === 'trial' 
      ? 'האם אתה בטוח שברצונך לבטל את תקופת הניסיון?'
      : 'האם אתה בטוח שברצונך לבטל את המנוי?';
      
    if (!confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('המנוי בוטל בהצלחה');
      fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('שגיאה בביטול המנוי');
    }
  };

  const handleUpgradeSubscription = () => {
    // Store current subscription details for upgrade comparison
    if (subscription) {
      sessionStorage.setItem('current_subscription', JSON.stringify({
        status: subscription.status,
        current_period_ends_at: subscription.current_period_ends_at
      }));
    }
    window.location.href = '/subscription?step=1';
  };

  // חישוב חיוב עתידי (אם יש)
  const getNextCharge = () => {
    if (!subscription) return null;
    if (subscription.status !== 'active' && subscription.status !== 'trial') return null;
    // נניח שמנוי חודשי/שנתי מתחדש אוטומטית
    const nextDate = new Date(subscription.current_period_ends_at);
    if (nextDate < new Date()) return null;
    let amount = 0;
    if (paymentLogs.length > 0) {
      // נניח שהסכום של החיוב האחרון הוא הסכום של החיוב הבא
      amount = paymentLogs[0].amount;
    }
    return { date: nextDate, amount };
  };
  const nextCharge = getNextCharge();

  if (isLoading) {
    return <div>טוען...</div>;
  }

  if (initError) {
    return <div className="text-red-600 text-center p-4">שגיאה: {initError}</div>;
  }

  if (!subscription) {
    return <div className="text-center p-4">לא נמצא מנוי פעיל. <a href="/subscription" className="text-blue-600 underline">להצטרפות</a></div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'trial':
        return 'תקופת ניסיון';
      case 'active':
        return 'פעיל';
      case 'cancelled':
        return 'מבוטל';
      default:
        return status;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">פרטי המנוי</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">סטטוס</p>
              <div className="mb-2">
                <span>סטטוס מנוי: </span>
                <span className={subscription.status === 'active' ? 'text-green-600' : subscription.status === 'trial' ? 'text-yellow-600' : 'text-red-600'}>
                  {subscription.status === 'active' ? 'פעיל' : subscription.status === 'trial' ? 'ניסיון' : 'לא פעיל'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-gray-600">תוקף המנוי</p>
              {subscription.current_period_ends_at && (
                <div className="mb-2">
                  <span>תוקף מנוי עד: </span>
                  <span>{new Date(subscription.current_period_ends_at).toLocaleDateString('he-IL')}</span>
                </div>
              )}
            </div>
            {subscription.payment_details?.card_info && (
              <div>
                <p className="text-gray-600">כרטיס אשראי</p>
                <p className="font-semibold">
                  {subscription.payment_details.card_info.card_type} •••• {subscription.payment_details.card_info.last4}
                </p>
                <p className="text-sm text-gray-500">
                  תפוגה: {subscription.payment_details.card_info.expiry}
                </p>
              </div>
            )}
            {/* מידע נוסף */}
            <div>
              <p className="text-gray-600">סוג מסלול</p>
              <p className="font-semibold">{paymentLogs[0]?.payment_data?.operation === 'ChargeOnly' ? 'VIP' : paymentLogs[0]?.payment_data?.operation === 'ChargeAndCreateToken' ? 'שנתי' : 'חודשי'}</p>
            </div>
            <div>
              <p className="text-gray-600">תאריך הצטרפות</p>
              <p className="font-semibold">{paymentLogs.length > 0 ? formatDate(paymentLogs[paymentLogs.length - 1].created_at) : '-'}</p>
            </div>
          </div>
        </div>
        {/* חיוב עתידי */}
        {nextCharge && (
          <div className="bg-blue-50 p-3 rounded mb-4">
            <span>החיוב הבא: </span>
            <span>{nextCharge.amount} ₪</span>
            <span> ב-</span>
            <span>{nextCharge.date.toLocaleDateString('he-IL')}</span>
          </div>
        )}

        <div className="mt-4">
          <h3 className="font-bold mb-2">היסטוריית תשלומים</h3>
          {paymentLogs && paymentLogs.length > 0 ? (
            <ul>
              {paymentLogs.map((log, idx) => (
                <li key={`${log.created_at}-${log.amount}-${idx}`} className="mb-1 flex items-center gap-2">
                  {log.amount} ₪ - {log.status === 'payment_success' ? 'הצלחה' : 'כישלון'}
                  {log.transaction_id ? ` - ${log.transaction_id}` : ''}
                  {/* כפתור להורדת קבלה */}
                  {log.status === 'payment_success' && (
                    log.receipt_url ? (
                      <a href={log.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">הורד קבלה</a>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => toast.info('קבלה תישלח למייל לאחר עיבוד')}>הורד קבלה</Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div>לא נמצאו תשלומים קודמים.</div>
          )}
        </div>

        <div className="flex gap-4">
          {subscription.status === 'active' && (
            <Button variant="destructive" onClick={handleCancelSubscription}>
              ביטול מנוי
            </Button>
          )}
          <Button onClick={handleUpgradeSubscription}>
            שדרוג מנוי
          </Button>
        </div>
      </div>
    </Card>
  );
}; 