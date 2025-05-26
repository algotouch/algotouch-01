import React, { createContext, useContext } from 'react';
import { useStockDataWithRefresh } from '@/hooks/useStockData';
import type { StockData } from '@/lib/api/stocks';

interface StockDataContextType {
  stockData: StockData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const StockDataContext = createContext<StockDataContextType | undefined>(undefined);

export const StockDataProvider: React.FC<{ children: React.ReactNode; refreshInterval?: number }> = ({ 
  children, 
  refreshInterval = 30000 
}) => {
  const stockDataState = useStockDataWithRefresh(refreshInterval);
  
  return (
    <StockDataContext.Provider value={stockDataState}>
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
