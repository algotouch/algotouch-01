
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { format, parseISO, isAfter } from 'date-fns';
import { SubscriptionStatus } from '@/types/subscription';

interface UserData {
  phone?: string;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface SubscriptionRecord {
  id: string;
  status: SubscriptionStatus;
  plan_type: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancelled_at: string | null;
  token: string | null;
  payment_method?: any;
  // Add other fields as needed
}

interface SubscriptionContextType {
  isCheckingSubscription: boolean;
  checkUserSubscription: (userId: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  fullName: string | null;
  email: string | null;
  userData: UserData | null;
  lastRefreshed: Date | null;
  error: string | null;
  
  // Instead of separate subscription state variables
  subscription: SubscriptionRecord | null;
  
  // Computed properties
  hasActiveSubscription: boolean;
  planType: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isCheckingSubscription, setIsCheckingSubscription] = useState<boolean>(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Computed property: hasActiveSubscription
  const hasActiveSubscription = React.useMemo(() => {
    if (!subscription) return false;
    
    const now = new Date();
    const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const currentPeriodEndsAt = subscription.current_period_ends_at ? new Date(subscription.current_period_ends_at) : null;
    
    const isActive = subscription.status === 'active';
    const isTrial = subscription.status === 'trial' && trialEndsAt && trialEndsAt > now;
    const isValidPeriod = currentPeriodEndsAt && currentPeriodEndsAt > now;
    const isCancelled = subscription.cancelled_at !== null && subscription.cancelled_at !== undefined;
    
    return (isActive || isTrial || isValidPeriod) && !isCancelled;
  }, [subscription]);

  // Computed property: planType
  const planType = subscription?.plan_type || null;

  // Check subscription on user change
  useEffect(() => {
    let checkInterval: number | undefined;
    
    const fetchData = async () => {
      if (user?.id) {
        try {
          await checkUserSubscription(user.id);
          setEmail(user.email || null);
          
          // Get user profile data
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, phone, id_number')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return;
          }
          
          if (data) {
            // Ensure data is properly type checked
            const profileData = data as {
              first_name?: string | null;
              last_name?: string | null;
              phone?: string | null;
              id_number?: string | null;
            };
            
            if (profileData.first_name || profileData.last_name) {
              setFullName(`${profileData.first_name || ''} ${profileData.last_name || ''}`.trim());
            }
            
            // Set user data with available fields
            setUserData({
              phone: profileData.phone || '',
              idNumber: profileData.id_number || '',
              firstName: profileData.first_name || '',
              lastName: profileData.last_name || '',
              email: user.email || ''
            });

            console.log('Profile data loaded:', profileData);
          }
        } catch (err) {
          console.error('Error loading user data:', err);
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
          } else {
            setError('שגיאה בטעינת נתוני המשתמש');
          }
        }
      } else {
        // Reset states when user is not logged in
        setSubscription(null);
        setFullName(null);
        setEmail(null);
        setUserData(null);
        setIsCheckingSubscription(false);
        setLastRefreshed(null);
        setError(null);
        setRetryCount(0);
      }
    };
    
    fetchData();
    
    // Set up periodic subscription check only if user is logged in
    if (user?.id) {
      checkInterval = window.setInterval(() => {
        if (retryCount < 3) {
          checkUserSubscription(user.id).catch(console.error);
        }
      }, 300000); // Every 5 minutes
    }
    
    return () => {
      if (checkInterval) {
        window.clearInterval(checkInterval);
      }
    };
  }, [user, retryCount]);

  const refreshSubscription = async () => {
    if (user?.id) {
      setRetryCount(0); // Reset retry count on manual refresh
      setError(null);
      await checkUserSubscription(user.id);
    }
  };

  const checkUserSubscription = async (userId: string) => {
    try {
      setIsCheckingSubscription(true);
      
      // Use maybeSingle to avoid errors if no subscription exists
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) {
        console.error('Error checking subscription:', error);
        throw error;
      }
      
      if (!data) {
        // No subscription found
        setSubscription(null);
        setLastRefreshed(new Date());
        return;
      }
      
      // Store the subscription record directly
      setSubscription(data as SubscriptionRecord);
      setLastRefreshed(new Date());
      
      // Check if we have a valid recurring payment token
      if (data.status === 'active' && !data.token) {
        console.log('Active subscription without token, checking recurring_payments');
        
        try {
          // Try to find a token in recurring_payments
          // FIX: Use ISO datetime comparison instead of just date comparison to properly handle timezones
          const { data: recurringPayments, error: recurringError } = await supabase
            .from('recurring_payments')
            .select('token, token_expiry, is_valid')
            .eq('user_id', userId)
            .eq('is_valid', true)
            .gte('token_expiry', new Date().toISOString().split('T')[0]) // Using date part only is fine since token_expiry is a date without time
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (recurringError) {
            console.error('Error checking recurring payments:', recurringError);
            return;
          }
            
          if (recurringPayments && recurringPayments.length > 0) {
            const tokenExpiryDate = parseISO(recurringPayments[0].token_expiry);
            const today = new Date();
            
            // Additional validation to ensure token is not expired
            // This uses date-fns to properly compare dates
            if (isAfter(tokenExpiryDate, today)) {
              console.log('Found valid token in recurring_payments, syncing to subscription');
              
              // Update subscription with token
              const { error: updateError } = await supabase
                .from('subscriptions')
                .update({
                  token: recurringPayments[0].token,
                  updated_at: new Date().toISOString()
                })
                .eq('id', data.id);
                
              if (updateError) {
                console.error('Error updating subscription with token:', updateError);
              } else {
                console.log(`Subscription ${data.id} updated with token ${recurringPayments[0].token}`);
                // Refresh subscription details after update
                refreshSubscription();
              }
            } else {
              console.log('Found token but it appears to be expired:', 
                format(tokenExpiryDate, 'yyyy-MM-dd'), 
                'vs today:', format(today, 'yyyy-MM-dd'));
            }
          }
        } catch (err) {
          console.error('Error handling recurring payments check:', err);
        }
      }
      
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      setError('שגיאה בבדיקת פרטי המנוי');
      
      if (retryCount >= 3) {
        toast.error('שגיאה בבדיקת פרטי המנוי');
      }
    } finally {
      setIsCheckingSubscription(false);
    }
  };

  const value = {
    isCheckingSubscription,
    checkUserSubscription,
    refreshSubscription,
    fullName,
    email,
    userData,
    lastRefreshed,
    error,
    
    // Single source of truth for subscription
    subscription,
    
    // Computed properties
    hasActiveSubscription,
    planType
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
