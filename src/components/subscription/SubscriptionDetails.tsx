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
}

export const SubscriptionDetails: React.FC = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
            }
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

  if (isLoading) {
    return <div>טוען...</div>;
  }

  if (!subscription) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">אין מנוי פעיל</h2>
        <Button onClick={handleUpgradeSubscription}>הרשמה למנוי</Button>
      </Card>
    );
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
              <p className="font-semibold">{getStatusText(subscription.status)}</p>
            </div>
            <div>
              <p className="text-gray-600">תוקף המנוי</p>
              <p className="font-semibold">{formatDate(subscription.current_period_ends_at)}</p>
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
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">היסטוריית תשלומים</h3>
          <div className="space-y-4">
            {paymentLogs.map((log, index) => (
              <div key={index} className="border-b pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {log.payment_data.operation === 'ChargeOnly' ? 'תשלום חד פעמי' :
                       log.payment_data.operation === 'ChargeAndCreateToken' ? 'תשלום שנתי' :
                       'תשלום חודשי'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₪{log.amount}</p>
                    <p className={`text-sm ${log.status === 'payment_success' ? 'text-green-600' : 'text-red-600'}`}>
                      {log.status === 'payment_success' ? 'שולם בהצלחה' : 'נכשל'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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