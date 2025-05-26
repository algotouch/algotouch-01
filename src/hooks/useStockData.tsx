<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
=======

import { useState, useEffect } from 'react';
>>>>>>> origin/main
import { useToast } from "@/components/ui/use-toast";
import { fetchStockIndices, type StockData } from '@/lib/api/stocks';

export function useStockDataWithRefresh(refreshInterval = 15000) {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

<<<<<<< HEAD
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchStockIndices();
      setStockData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch stock data');
      console.error(err);
=======
  const fetchData = async () => {
    try {
      setError(null);
      const data = await fetchStockIndices();
      setStockData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = 'Failed to fetch stock data';
      setError(errorMessage);
      console.error('Stock data fetch error:', err);
>>>>>>> origin/main
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן להטעין את נתוני המדדים. נסה לרענן את הדף.",
        variant: "destructive",
      });
    } finally {
<<<<<<< HEAD
      setLoading(false);
    }
  }, [toast]);

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
=======
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    setIsLoading(true);
    fetchData();
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      await fetchData();
    };

    // Initial fetch
    loadData();

    // Set up interval for refreshing data
    const intervalId = setInterval(() => {
      if (isMounted) {
        fetchData();
      }
    }, refreshInterval);

    // Clean up interval on component unmount
>>>>>>> origin/main
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
<<<<<<< HEAD
  }, [fetchData, refreshInterval]);
=======
  }, [refreshInterval]);
>>>>>>> origin/main

  return { 
    stockData, 
    isLoading, 
    error, 
    lastUpdated,
    refreshData
  };
}
