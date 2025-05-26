
import React, { createContext, useContext, ReactNode } from 'react';
import { useStockDataWithRefresh, type StockData } from '@/hooks/useStockData';

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
  const stockDataHook = useStockDataWithRefresh(refreshInterval);

  return (
    <StockDataContext.Provider value={stockDataHook}>
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
