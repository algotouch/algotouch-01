
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { fetchStockIndices } from '@/lib/api/stockService';

type StockData = {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
};

export function useStockDataWithRefresh(refreshInterval = 15000) {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const fetchData = async () => {
      try {
        if (!isMounted) return;
        
        console.log('useStockData: Fetching stock data...');
        const data = await fetchStockIndices();
        
        if (isMounted) {
          setStockData(data);
          setLastUpdated(new Date());
          setError(null);
          retryCount = 0; // Reset retry count on success
          console.log('useStockData: Successfully loaded stock data:', data.length, 'items');
        }
      } catch (err) {
        console.error('useStockData: Error fetching stock data:', err);
        
        if (isMounted) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.log(`useStockData: Retrying in 2 seconds (attempt ${retryCount}/${maxRetries})`);
            setTimeout(() => {
              if (isMounted) {
                fetchData();
              }
            }, 2000);
          } else {
            setError('Failed to fetch stock data after multiple attempts');
            // Only show toast if we've exhausted all retries
            toast({
              title: "בעיה בטעינת נתוני מדדים",
              description: "נתוני המדדים יוצגו כנתונים לדוגמה. נסה לרענן את הדף.",
              variant: "destructive",
            });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for refreshing data - but only if not in error state
    const intervalId = setInterval(() => {
      if (!error) {
        fetchData();
      }
    }, refreshInterval);

    // Clean up interval on component unmount
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval, toast, error]);

  return { stockData, loading, error, lastUpdated };
}
