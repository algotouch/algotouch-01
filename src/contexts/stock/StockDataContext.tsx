
import React, { createContext, useContext } from 'react';
import { useStockDataWithRefresh } from '@/lib/api/stocks';

type StockData = {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
};

interface StockDataContextType {
  stockData: StockData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const StockDataContext = createContext<StockDataContextType | undefined>(undefined);

export const StockDataProvider: React.FC<{ children: React.ReactNode; refreshInterval?: number }> = ({ 
  children, 
  refreshInterval = 2000 // Changed from 30000 to 2000 (2 seconds)
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
