import { useState, useEffect, useCallback } from 'react';

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  lastUpdate: string;
  isPositive?: boolean;
}

const MOCK_STOCKS: StockData[] = [
  {
    symbol: 'TEVA',
    price: 8.45,
    change: 0.12,
    changePercent: 1.44,
    volume: 1250000,
    marketCap: 9280000000,
    lastUpdate: new Date().toISOString(),
    isPositive: true
  },
  {
    symbol: 'CHKP',
    price: 142.33,
    change: -2.15,
    changePercent: -1.49,
    volume: 890000,
    marketCap: 18500000000,
    lastUpdate: new Date().toISOString(),
    isPositive: false
  }
];

// Mock function to simulate fetching stock indices
export const fetchStockIndices = async (): Promise<StockData[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const updatedStocks = MOCK_STOCKS.map(stock => ({
    ...stock,
    price: Number((stock.price + (Math.random() - 0.5) * 2).toFixed(2)),
    change: Number(((Math.random() - 0.5) * 5).toFixed(2)),
    changePercent: Number(((Math.random() - 0.5) * 10).toFixed(2)),
    lastUpdate: new Date().toISOString(),
    isPositive: Math.random() > 0.5
  }));
  
  return updatedStocks;
};

export interface StockDataState {
  data: StockData[];
  isLoading: boolean;
  error: Error | null;
}

export const useStockDataWithRefresh = (refreshInterval: number = 30000): StockDataState => {
  const [state, setState] = useState<StockDataState>({
    data: [],
    isLoading: true,
    error: null
  });

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchStockIndices();
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Failed to fetch stock data')
      }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const safeSetState = (updater: (prev: StockDataState) => StockDataState) => {
      if (isMounted) {
        setState(updater);
      }
    };

    const fetchDataSafely = async () => {
      try {
        const data = await fetchStockIndices();
        safeSetState(prev => ({
          ...prev,
          data,
          isLoading: false,
          error: null
        }));
      } catch (error) {
        safeSetState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to fetch stock data')
        }));
      }
    };

    // Initial fetch
    fetchDataSafely();

    // Set up refresh interval
    intervalId = setInterval(fetchDataSafely, refreshInterval);

    // Cleanup
    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval, fetchData]);

  return state;
};
