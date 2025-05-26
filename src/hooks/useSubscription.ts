import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useSubscriptionActions } from '@/services/subscription/hooks/useSubscriptionActions';
import { SubscriptionDetails } from '@/services/subscription/types';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

export interface UseSubscriptionReturn {
  subscription: any;
  loading: boolean;
  details: SubscriptionDetails | null;
  error: string | null;
  cancelSubscription: (reason: string, feedback?: string) => Promise<boolean>;
  reactivateSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<boolean>;
  checkForUnprocessedPayments: () => Promise<boolean>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  const { subscription: contextSubscription, refreshSubscription: contextRefresh } = useSubscriptionContext();
  const [error, setError] = useState<string | null>(null);
  const [isCheckingPayments, setIsCheckingPayments] = useState<boolean>(false);
  
  const {
    subscription,
    details,
    status: { loading },
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription: actionsRefresh
  } = useSubscriptionActions({
    userId: user?.id,
    subscriptionId: contextSubscription?.id, // Now using the single subscription source from context
    onError: (error) => {
      setError(error.message || 'שגיאה בטעינת נתוני המנוי');
      toast.error(error.message || 'שגיאה בטעינת נתוני המנוי');
    }
  });

  // Enhanced function to check for unprocessed payments that belong to this user
  const checkForUnprocessedPayments = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    
    try {
      setIsCheckingPayments(true);
      
      // Check for unprocessed webhooks with this user's email
      // Fix: Use a different approach to query JSON fields to avoid TypeScript errors
      const { data: webhooks, error: webhookError } = await supabase
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (webhookError) {
        console.error('Error checking for unprocessed webhooks:', webhookError);
        return false;
      }
      
      // Manually filter webhooks that contain the user's email in the payload
      if (webhooks && webhooks.length > 0) {
        const userRelatedWebhooks = webhooks.filter(webhook => {
          // Ensure payload is an object before accessing properties
          if (typeof webhook.payload !== 'object' || webhook.payload === null) return false;
          
          const payload = webhook.payload as Record<string, any>;
          
          // Safely access nested properties
          const tranzactionInfo = payload.TranzactionInfo || {};
          const uiValues = payload.UIValues || {};
          
          const tranzactionEmail = typeof tranzactionInfo === 'object' ? 
            (tranzactionInfo.CardOwnerEmail || '') : '';
            
          const uiValuesEmail = typeof uiValues === 'object' ? 
            (uiValues.CardOwnerEmail || '') : '';
          
          // Return true if the email is found in either location
          return tranzactionEmail.toString().toLowerCase().includes(user.email.toLowerCase()) || 
                 uiValuesEmail.toString().toLowerCase().includes(user.email.toLowerCase());
        });
        
        if (userRelatedWebhooks.length > 0) {
          console.log('Found unprocessed webhook(s) for user email:', user.email, userRelatedWebhooks.length);
          return true;
        }
      }
      
      // If no webhook found by email, check by specific LowProfileId from known tokens
      // This is a fallback mechanism
      const { data: payments } = await supabase
        .from('user_payment_logs')
        .select('token')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (payments && payments.length > 0) {
        // For each token/LowProfileId, check if there are unprocessed webhooks
        for (const payment of payments) {
          if (!payment.token) continue;
          
          const { data: tokenWebhooks } = await supabase
            .from('payment_webhooks')
            .select('*')
            .eq('processed', false)
            .limit(10);
            
          if (tokenWebhooks && tokenWebhooks.length > 0) {
            // Manually filter to find webhooks matching this token
            const matchingWebhooks = tokenWebhooks.filter(webhook => {
              // Ensure payload is an object before accessing properties
              if (typeof webhook.payload !== 'object' || webhook.payload === null) return false;
              
              const payload = webhook.payload as Record<string, any>;
              return payload.LowProfileId === payment.token;
            });
            
            if (matchingWebhooks.length > 0) {
              console.log('Found unprocessed webhook by token:', payment.token);
              return true;
            }
          }
        }
      }
      
      // Also check recurring_payments table for this user
      const { data: recurringPayments, error: recurringError } = await supabase
        .from('recurring_payments')
        .select('token, is_valid, token_expiry')
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .gte('token_expiry', new Date().toISOString().split('T')[0])
        .limit(1);
        
      if (recurringError) {
        console.error('Error checking recurring payments:', recurringError);
      } else {
        if (recurringPayments && recurringPayments.length === 0 && subscription) {
          console.log('User has subscription but no valid recurring payment token');
          // This indicates a potential inconsistency that might need fixing
          return true;
        }
        
        // Check if there's a mismatch between subscription and recurring_payments
        if (recurringPayments?.length > 0 && subscription) {
          const recurringToken = recurringPayments[0].token;
          
          if (subscription.token !== recurringToken) {
            console.log('Token mismatch between subscription and recurring_payments');
            // There's an inconsistency that needs to be fixed
            return true;
          }
        }
      }
      
      return false;
    } catch (err) {
      console.error('Error in checkForUnprocessedPayments:', err);
      return false;
    } finally {
      setIsCheckingPayments(false);
    }
  }, [user, subscription]);

  // Combine the refreshSubscription methods from context and actions
  const refreshSubscription = useCallback(async (): Promise<boolean> => {
    try {
      // First refresh from subscription actions
      await actionsRefresh();
      
      // Then refresh from context
      await contextRefresh();
      
      return true;
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      setError('שגיאה בטעינת נתוני המנוי');
      return false;
    }
  }, [actionsRefresh, contextRefresh]);

  // Enhanced function to load subscription data when user changes
  useEffect(() => {
    if (user?.id) {
      refreshSubscription().catch((err) => {
        console.error('Error refreshing subscription:', err);
        setError('שגיאה בטעינת נתוני המנוי');
      });
    }
  }, [user, refreshSubscription]);
  
  // Automatically check for unprocessed payments when the component mounts
  useEffect(() => {
    if (user?.id && user?.email) {
      checkForUnprocessedPayments().then(hasUnprocessed => {
        if (hasUnprocessed && !subscription) {
          console.log('Found unprocessed payments, user might need to sync subscription data');
        }
      }).catch(console.error);
    }
  }, [user, subscription, checkForUnprocessedPayments]);

  return { 
    subscription: subscription || contextSubscription, // Prioritize subscription from actions, fallback to context
    loading: loading || isCheckingPayments, 
    details, 
    error,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    checkForUnprocessedPayments
  };
};
