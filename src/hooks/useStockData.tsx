import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { fetchStockIndices, type StockData } from '@/lib/api/stocks';

export function useStockDataWithRefresh(refreshInterval = 15000) {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchStockIndices();
      setStockData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = 'Failed to fetch stock data';
      setError(errorMessage);
      console.error('Stock data fetch error:', err);
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן להטעין את נתוני המדדים. נסה לרענן את הדף.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refreshData = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const scheduleNextFetch = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        if (isMounted) {
          fetchData().finally(() => {
            if (isMounted) {
              scheduleNextFetch();
            }
          });
        }
      }, refreshInterval);
    };

    // Initial fetch
    fetchData().finally(() => {
      if (isMounted) {
        scheduleNextFetch();
      }
    });

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchData, refreshInterval]);

  return { 
    stockData, 
    isLoading, 
    error, 
    lastUpdated,
    refreshData
  };
}
