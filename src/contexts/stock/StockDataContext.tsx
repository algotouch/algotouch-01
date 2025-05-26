import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useStockDataWithRefresh } from '@/hooks/useStockData';
import type { StockData } from '@/lib/api/stocks';

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
  const stockDataState = useStockDataWithRefresh(refreshInterval);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    stockData: stockDataState.stockData,
    isLoading: stockDataState.isLoading,
    error: stockDataState.error,
    lastUpdated: stockDataState.lastUpdated,
    refreshData: stockDataState.refreshData
  }), [
    stockDataState.stockData,
    stockDataState.isLoading,
    stockDataState.error,
    stockDataState.lastUpdated,
    stockDataState.refreshData
  ]);
  
  return (
    <StockDataContext.Provider value={contextValue}>
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
