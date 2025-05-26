
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { getUserReputation } from '@/lib/community/reputation-service';
import { useReputationActions } from './useReputationActions';
import { useStreakActions } from './useStreakActions';
import { UserStreak } from '@/lib/community/types';

// Define the context type
interface ReputationContextType {
  userPoints: number;
  userLevel: number;
  userStreak: UserStreak | null;
  checkAndAwardDailyLogin: () => Promise<void>;
  refreshData: {
    fetchUserReputation: () => Promise<void> | void;
    updateUserStreak: () => Promise<void>;
  }
}

// Create the context with default values
const ReputationContext = createContext<ReputationContextType>({
  userPoints: 0,
  userLevel: 1,
  userStreak: null,
  checkAndAwardDailyLogin: async () => {},
  refreshData: {
    fetchUserReputation: () => {},
    updateUserStreak: async () => {}
  }
});

export const ReputationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Use the existing reputation and streak action hooks
  const { 
    userPoints, 
    userLevel, 
    checkAndAwardDailyLogin,
    updateReputationData
  } = useReputationActions(user?.id);
  
  const {
    userStreak,
    updateUserStreak
  } = useStreakActions(user?.id);
  
  // Fetch user reputation when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      updateReputationData().catch(err => 
        console.error('Error fetching user reputation:', err));
      updateUserStreak().catch(err => 
        console.error('Error updating user streak:', err));
    }
  }, [isAuthenticated, user]);
  
  // Check for daily login once when component mounts
  useEffect(() => {
    if (isAuthenticated && user) {
      checkAndAwardDailyLogin().catch(err =>
        console.error('Error checking daily login:', err));
    }
  }, [isAuthenticated, user]);
  
  // Provide context value
  const value: ReputationContextType = {
    userPoints,
    userLevel,
    userStreak,
    checkAndAwardDailyLogin,
    refreshData: {
      fetchUserReputation: () => user && updateReputationData(),
      updateUserStreak: async () => {
        if (user) await updateUserStreak();
      }
    }
  };
  
  return (
    <ReputationContext.Provider value={value}>
      {children}
    </ReputationContext.Provider>
  );
};

export const useReputation = () => {
  const context = useContext(ReputationContext);
  
  if (context === undefined) {
    throw new Error('useReputation must be used within a ReputationProvider');
  }
  
  return context;
};
