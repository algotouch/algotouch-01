import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchStockIndices } from '@/lib/api/stockService';

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
  refetch: () => void;
}

const StockDataContext = createContext<StockDataContextType | undefined>(undefined);

interface StockDataProviderProps {
  children: ReactNode;
  refreshInterval?: number;
}

const fallbackData: StockData[] = [
  { 
    symbol: "S&P 500", 
    price: "5246.67",
    changePercent: "0.8%",
    change: "42.12",
    isPositive: true
  },
  { 
    symbol: "Nasdaq", 
    price: "16742.39",
    changePercent: "1.2%",
    change: "198.65",
    isPositive: true
  },
  { 
    symbol: "Dow Jones", 
    price: "38836.50",
    changePercent: "-0.3%",
    change: "-118.54",
    isPositive: false
  },
  { 
    symbol: "Tel Aviv 35", 
    price: "1995.38",
    changePercent: "0.5%",
    change: "9.86",
    isPositive: true
  },
  { 
    symbol: "Bitcoin", 
    price: "70412.08",
    changePercent: "2.4%",
    change: "1650.45",
    isPositive: true
  },
  { 
    symbol: "Gold", 
    price: "2325.76",
    changePercent: "0.7%",
    change: "16.23",
    isPositive: true
  }
];

export const StockDataProvider: React.FC<StockDataProviderProps> = ({ 
  children, 
  refreshInterval = 30000 
}) => {
  const [stockData, setStockData] = useState<StockData[]>(fallbackData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  const fetchData = async () => {
    if (!navigator.onLine) {
      console.log('StockDataProvider: Offline - using fallback data');
      return;
    }

    try {
      setLoading(true);
      console.log('StockDataProvider: Fetching stock data...');
      
      const data = await fetchStockIndices();
      
      if (data && data.length > 0) {
        setStockData(data);
        setLastUpdated(new Date());
        setError(null);
        console.log('StockDataProvider: Successfully updated stock data');
      } else {
        throw new Error('No data received');
      }
    } catch (err) {
      console.warn('StockDataProvider: Failed to fetch data, using fallback:', err);
      setError('Failed to fetch live data');
      // Keep existing data or use fallback
      if (stockData.length === 0) {
        setStockData(fallbackData);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up interval for refreshing data
    const intervalId = setInterval(fetchData, refreshInterval);

    // Listen for online/offline events
    const handleOnline = () => {
      console.log('StockDataProvider: Connection restored, fetching data');
      fetchData();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshInterval]);

  const contextValue: StockDataContextType = {
    stockData,
    loading,
    error,
    lastUpdated,
    refetch: fetchData
  };

  return (
    <StockDataContext.Provider value={contextValue}>
      {children}
    </StockDataContext.Provider>
  );
};

export const useStockData = (): StockDataContextType => {
  const context = useContext(StockDataContext);
  if (context === undefined) {
    console.warn('useStockData: Context not found, returning fallback');
    return {
      stockData: fallbackData,
      loading: false,
      error: 'Context not available',
      lastUpdated: new Date(),
      refetch: () => {}
    };
  }
  return context;
};
