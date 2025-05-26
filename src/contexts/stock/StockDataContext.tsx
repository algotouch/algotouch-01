import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useStockDataWithRefresh, type StockData, type StockDataState } from '@/lib/api/stocks';

interface StockDataContextType extends StockDataState {}

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
  const contextValue = useMemo<StockDataContextType>(() => ({
    stockData: stockDataState.stockData,
    isLoading: stockDataState.isLoading,
    error: stockDataState.error,
    refreshData: stockDataState.refreshData
  }), [
    stockDataState.stockData,
    stockDataState.isLoading,
    stockDataState.error,
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
