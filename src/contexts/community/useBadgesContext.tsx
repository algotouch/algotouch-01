
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { Badge, UserBadge } from '@/lib/community/types';
import { getUserBadges, getAllBadges } from '@/lib/community/badges-service';

// Define the context type
interface BadgesContextType {
  userBadges: UserBadge[];
  allBadges: Badge[];
  refreshData: {
    fetchUserBadges: () => Promise<void> | void;
    fetchAllBadges: () => Promise<void>;
  }
}

// Create the context with default values
const BadgesContext = createContext<BadgesContextType>({
  userBadges: [],
  allBadges: [],
  refreshData: {
    fetchUserBadges: () => {},
    fetchAllBadges: async () => {}
  }
});

export const BadgesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  
  // Initialize on mount
  useEffect(() => {
    fetchAllBadges().catch(err => console.error('Error fetching badges:', err));
  }, []);
  
  // Fetch current user's badges when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserBadges(user.id).catch(err => console.error('Error fetching user badges:', err));
    }
  }, [isAuthenticated, user]);
  
  const fetchAllBadges = async () => {
    try {
      const badges = await getAllBadges();
      setAllBadges(badges);
    } catch (error) {
      console.error('Error fetching all badges:', error);
    }
  };
  
  const fetchUserBadges = async (userId: string) => {
    try {
      const fetchedBadges = await getUserBadges(userId);
      setUserBadges(fetchedBadges);
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };
  
  // Provide context value
  const value: BadgesContextType = {
    userBadges,
    allBadges,
    refreshData: {
      fetchUserBadges: () => user && fetchUserBadges(user.id),
      fetchAllBadges
    }
  };
  
  return (
    <BadgesContext.Provider value={value}>
      {children}
    </BadgesContext.Provider>
  );
};

export const useBadges = () => {
  const context = useContext(BadgesContext);
  
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgesProvider');
  }
  
  return context;
};
