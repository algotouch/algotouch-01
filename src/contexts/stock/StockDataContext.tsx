
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

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

// Fallback data
const fallbackStockData: StockData[] = [
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

export const StockDataProvider: React.FC<{ children: React.ReactNode; refreshInterval?: number }> = ({ 
  children, 
  refreshInterval = 30000 
}) => {
  const [stockData, setStockData] = useState<StockData[]>(fallbackStockData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('stock-data');
        
        if (isMounted) {
          if (data && !error) {
            setStockData(data);
            setError(null);
          } else {
            setStockData(fallbackStockData);
            setError(null);
          }
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (isMounted) {
          setStockData(fallbackStockData);
          setError(null);
          setLastUpdated(new Date());
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval]);

  return (
    <StockDataContext.Provider value={{ stockData, loading, error, lastUpdated }}>
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
