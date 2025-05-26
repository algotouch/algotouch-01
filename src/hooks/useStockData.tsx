import * as React from 'react';
import { useToast } from "@/components/ui/use-toast";
import { fetchStockIndices, type StockData } from '@/lib/api/stocks';

export function useStockDataWithRefresh(refreshInterval = 15000) {
  const [stockData, setStockData] = React.useState<StockData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        const data = await fetchStockIndices();
        
        if (isMounted) {
          setStockData(data);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch stock data');
          console.error(err);
          toast({
            title: "שגיאה בטעינת נתונים",
            description: "לא ניתן להטעין את נתוני המדדים. נסה לרענן את הדף.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for refreshing data
    const intervalId = setInterval(fetchData, refreshInterval);

    // Clean up interval on component unmount
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval, toast]);

  return { stockData, loading, error, lastUpdated };
} 