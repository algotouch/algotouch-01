import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '../auth/AuthContext';

interface ReputationContextType {
  userReputation: number;
  loading: boolean;
  error: string | null;
  fetchUserReputation: () => Promise<void>;
}

const ReputationContext = createContext<ReputationContextType | undefined>(undefined);

export const ReputationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userReputation, setUserReputation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchUserReputation = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_reputation')
        .select('reputation')
        .eq('user_id', user.id)
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setUserReputation(data.reputation);
      } else {
        // If no data, assume reputation is 0
        setUserReputation(0);
      }
    } catch (err) {
      setError('Failed to fetch user reputation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserReputation();
  }, [user]);

  const value: ReputationContextType = {
    userReputation,
    loading,
    error,
    fetchUserReputation,
  };

  return (
    <ReputationContext.Provider value={value}>
      {children}
    </ReputationContext.Provider>
  );
};

export const useReputation = (): ReputationContextType => {
  const context = useContext(ReputationContext);
  if (!context) {
    throw new Error('useReputation must be used within a ReputationProvider');
  }
  return context;
};
