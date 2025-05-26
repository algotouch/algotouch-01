<<<<<<< HEAD
import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useStockDataWithRefresh } from '@/hooks/useStockData';
import type { StockData } from '@/lib/api/stocks';
=======

import React, { createContext, useContext, ReactNode } from 'react';
import { useStockDataWithRefresh, type StockData } from '@/hooks/useStockData';
>>>>>>> origin/main

interface StockDataContextType {
  stockData: StockData[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => void;
}

const StockDataContext = createContext<StockDataContextType | undefined>(undefined);

interface StockDataProviderProps {
  children: ReactNode;
  refreshInterval?: number;
}

export const StockDataProvider: React.FC<StockDataProviderProps> = ({ 
  children, 
  refreshInterval = 30000 
}) => {
<<<<<<< HEAD
  const stockDataState = useStockDataWithRefresh(refreshInterval);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => stockDataState, [
    stockDataState.stockData,
    stockDataState.loading,
    stockDataState.error,
    stockDataState.lastUpdated
  ]);
  
  return (
    <StockDataContext.Provider value={contextValue}>
=======
  const stockDataHook = useStockDataWithRefresh(refreshInterval);

  return (
    <StockDataContext.Provider value={stockDataHook}>
>>>>>>> origin/main
      {children}
    </StockDataContext.Provider>
  );
};

export const useStockData = (): StockDataContextType => {
  const context = useContext(StockDataContext);
  if (context === undefined) {
    throw new Error('useStockData must be used within a StockDataProvider');
  }
  return context;
};
