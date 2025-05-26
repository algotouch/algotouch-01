
import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { fetchStockIndices, type StockData } from '@/lib/api/stocks';

export function useStockDataWithRefresh(refreshInterval = 15000) {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

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
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "לא ניתן להטעין את נתוני המדדים. נסה לרענן את הדף.",
        variant: "destructive",
      });
    } finally {
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
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval]);

  return { 
    stockData, 
    isLoading, 
    error, 
    lastUpdated,
    refreshData
  };
}
