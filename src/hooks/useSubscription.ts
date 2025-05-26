import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthContext';

interface SubscriptionStatus {
  isSubscribed: boolean;
  isTrialing: boolean;
  expiresAt: string | null;
  planName: string | null;
  planId: string | null;
  subscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
}

const defaultSubscriptionStatus: SubscriptionStatus = {
  isSubscribed: false,
  isTrialing: false,
  expiresAt: null,
  planName: null,
  planId: null,
  subscriptionId: null,
  cancelAtPeriodEnd: false
};

export const useSubscription = () => {
  const { user, session, isAuthenticated } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(defaultSubscriptionStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSubscriptionStatus = async () => {
      if (!isAuthenticated || !user || !session) {
        setSubscriptionStatus(defaultSubscriptionStatus);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/subscription/status?userId=${user.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch subscription status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (isMounted) {
          setSubscriptionStatus({
            isSubscribed: data.is_subscribed || false,
            isTrialing: data.is_trialing || false,
            expiresAt: data.expires_at || null,
            planName: data.plan_name || null,
            planId: data.plan_id || null,
            subscriptionId: data.subscription_id || null,
            cancelAtPeriodEnd: data.cancel_at_period_end || false
          });
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || 'Failed to fetch subscription status');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSubscriptionStatus();

    return () => {
      isMounted = false;
    };
  }, [user, session, isAuthenticated]);

  return {
    ...subscriptionStatus,
    loading,
    error
  };
};
