import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth/AuthContext';

interface SubscriptionContextType {
  isSubscriptionActive: boolean | null;
  isSubscriptionLoading: boolean;
  isSubscriptionError: string | null;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isSubscriptionActive, setIsSubscriptionActive] = useState<boolean | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState<boolean>(false);
  const [isSubscriptionError, setIsSubscriptionError] = useState<string | null>(null);

  const checkSubscription = async () => {
    if (!user) {
      setIsSubscriptionActive(false);
      return;
    }

    setIsSubscriptionLoading(true);
    setIsSubscriptionError(null);

    try {
      // Simulate an API call to check subscription status
      // Replace this with your actual API call
      const response = await fetch('/api/subscription/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsSubscriptionActive(data.isActive);
      } else {
        setIsSubscriptionError('Failed to check subscription status');
        toast.error('Failed to check subscription status');
        setIsSubscriptionActive(false);
      }
    } catch (error: any) {
      setIsSubscriptionError(error.message || 'An unexpected error occurred');
      toast.error(error.message || 'An unexpected error occurred');
      setIsSubscriptionActive(false);
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const value: SubscriptionContextType = {
    isSubscriptionActive,
    isSubscriptionLoading,
    isSubscriptionError,
    checkSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
