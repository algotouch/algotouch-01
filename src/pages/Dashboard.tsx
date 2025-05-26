
import React from 'react';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw, Clock, BookOpen, Newspaper, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import BlogSection from '@/components/BlogSection';
import { useStockData } from '@/contexts/stock/StockDataContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const StockIndicesSection = () => {
  const { stockData, loading, error, lastUpdated } = useStockData();
  
  // Format last updated time
  const formattedStocksLastUpdated = lastUpdated 
    ? format(lastUpdated, 'HH:mm:ss')
    : 'לא ידוע';

  // Handle error state with fallback
  if (error && stockData.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <span>מדדים בזמן אמת</span>
          </h2>
        </div>
        
        <Card className="p-6 border-orange-300 bg-orange-50 dark:bg-orange-900/10">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <p className="text-orange-800 dark:text-orange-400 font-medium">
              בעיה זמנית בטעינת נתוני מדדים
            </p>
          </div>
          <p className="text-orange-700 dark:text-orange-300 text-sm mb-4">
            נתוני המדדים יוצגו כנתונים לדוגמה. האפליקציה תנסה לטעון נתונים אמיתיים שוב בעוד מספר דקות.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            רענן נתונים
          </Button>
        </Card>
      </div>
    );
  }
    
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <span>מדדים בזמן אמת</span>
          {error && (
            <AlertCircle className="h-4 w-4 text-orange-500 ml-2" title="נתונים לדוגמה" />
          )}
        </h2>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock size={14} className="mr-1" />
          <span>עודכן לאחרונה: {formattedStocksLastUpdated}</span>
        </div>
      </div>
      
      {loading && stockData.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="hover-scale">
              <CardContent className="p-4">
                <div className="flex justify-between items-center animate-pulse">
                  <div className="w-20 h-6 bg-muted rounded"></div>
                  <div className="w-16 h-6 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stockData.map((index) => (
            <Card key={index.symbol} className="hover-scale">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-foreground">{index.symbol}</h3>
                    <p className="text-2xl font-medium mt-1">{index.price}</p>
                  </div>
                  <div className={`flex items-center text-lg ${index.isPositive ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                    {index.isPositive ? 
                      <ArrowUpRight className="mr-1" size={20} /> : 
                      <ArrowDownRight className="mr-1" size={20} />
                    }
                    <span>{index.changePercent} ({index.change})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Dashboard component
const Dashboard = () => {
  const { toast } = useToast();

  const handleManualRefresh = () => {
    window.location.reload();
    toast({
      title: "מרענן נתונים",
      description: "הנתונים מתעדכנים...",
      duration: 2000,
    });
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-8 flex items-center">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">לוח בקרה</span>
          </h1>
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 mb-8"
          >
            <RefreshCw size={14} className="mr-1" />
            <span>רענן נתונים</span>
          </Button>
        </div>
        
        {/* Stock Indices Section - First for greater prominence */}
        <ErrorBoundary fallback={<div>שגיאה בטעינת נתוני מדד. אנא נסה לרענן את הדף.</div>}>
          <StockIndicesSection />
        </ErrorBoundary>
        
        {/* Blog Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Newspaper size={18} className="text-primary" />
              <span>פוסטים אחרונים</span>
            </h2>
          </div>
          <BlogSection />
        </div>
        
        {/* Courses Section - Last */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <span>קורסים דיגיטליים</span>
          </h2>
          <Courses />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
