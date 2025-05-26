import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/auth/AuthContext';

interface BadgesContextType {
  badges: any[];
  loading: boolean;
  error: string | null;
  fetchBadges: () => Promise<void>;
  assignBadge: (userId: string, badgeId: number) => Promise<void>;
  revokeBadge: (userId: string, badgeId: number) => Promise<void>;
}

const BadgesContext = createContext<BadgesContextType | undefined>(undefined);

export const BadgesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*');

      if (error) {
        setError(error.message);
      } else {
        setBadges(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch badges');
    } finally {
      setLoading(false);
    }
  };

  const assignBadge = async (userId: string, badgeId: number) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert([{ user_id: userId, badge_id: badgeId }]);

      if (error) {
        setError(error.message);
      } else {
        // Refresh badges after assignment
        await fetchBadges();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign badge');
    } finally {
      setLoading(false);
    }
  };

  const revokeBadge = async (userId: string, badgeId: number) => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .match({ user_id: userId, badge_id: badgeId });

      if (error) {
        setError(error.message);
      } else {
        // Refresh badges after revoke
        await fetchBadges();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revoke badge');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchBadges();
    }
  }, [session]);

  const value: BadgesContextType = {
    badges,
    loading,
    error,
    fetchBadges,
    assignBadge,
    revokeBadge
  };

  return (
    <BadgesContext.Provider value={value}>
      {children}
    </BadgesContext.Provider>
  );
};

export const useBadges = (): BadgesContextType => {
  const context = useContext(BadgesContext);
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgesProvider');
  }
  return context;
};
