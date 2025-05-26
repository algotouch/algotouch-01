
import { useState, useEffect, useRef } from 'react';

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  lastUpdate: string;
}

const MOCK_STOCKS: StockData[] = [
  {
    symbol: 'TEVA',
    price: 8.45,
    change: 0.12,
    changePercent: 1.44,
    volume: 1250000,
    marketCap: 9280000000,
    lastUpdate: new Date().toISOString()
  },
  {
    symbol: 'CHKP',
    price: 142.33,
    change: -2.15,
    changePercent: -1.49,
    volume: 890000,
    marketCap: 18500000000,
    lastUpdate: new Date().toISOString()
  }
];

export const useStockDataWithRefresh = (refreshInterval: number = 30000) => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchStockData = async () => {
    try {
      setError(null);
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedStocks = MOCK_STOCKS.map(stock => ({
        ...stock,
        price: stock.price + (Math.random() - 0.5) * 2,
        change: (Math.random() - 0.5) * 5,
        changePercent: (Math.random() - 0.5) * 10,
        lastUpdate: new Date().toISOString()
      }));
      
      setStockData(updatedStocks);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch stock data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchStockData, refreshInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval]);

  const refreshData = () => {
    setIsLoading(true);
    fetchStockData();
  };

  return {
    stockData,
    isLoading,
    error,
    refreshData
  };
};
