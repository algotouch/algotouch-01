
import { supabase } from "@/integrations/supabase/client";

type StockData = {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
};

// Function to fetch real stock data from our Supabase Edge Function
export async function fetchStockIndices(): Promise<StockData[]> {
  try {
    console.log('Fetching stock data from edge function...');
    const { data, error } = await supabase.functions.invoke('stock-data');
    
    if (error) {
      console.error('Error fetching stock data from edge function:', error);
      throw error;
    }
    
    console.log('Successfully fetched stock data:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching stock data:', error);
    
    // Fallback to sample data if the API request fails
    return [
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
  }
}
