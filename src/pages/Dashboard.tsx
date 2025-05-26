import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Users, Calendar, BookOpen, MessageSquare } from 'lucide-react';
import { useStockData } from '@/contexts/stock/StockDataProvider';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { stockData, loading, error, lastUpdated } = useStockData();
  const { user, session, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>מדד הדגל</CardTitle>
            <CardDescription>S&P 500</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5,246.67</div>
            <div className="flex items-center space-x-1 text-sm text-green-500 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>+0.8%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הייטק</CardTitle>
            <CardDescription>Nasdaq</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">16,742.39</div>
            <div className="flex items-center space-x-1 text-sm text-green-500 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>+1.2%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>תעשייה כבדה</CardTitle>
            <CardDescription>Dow Jones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38,836.50</div>
            <div className="flex items-center space-x-1 text-sm text-red-500 dark:text-red-400">
              <TrendingDown className="h-4 w-4" />
              <span>-0.3%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>הבורסה המקומית</CardTitle>
            <CardDescription>Tel Aviv 35</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,995.38</div>
            <div className="flex items-center space-x-1 text-sm text-green-500 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>+0.5%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>ביצועי תיק השקעות</CardTitle>
            <CardDescription>סקירה כללית של ביצועי התיק שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5%</div>
            <div className="text-sm text-muted-foreground">בהשוואה לתקופה המקבילה אשתקד</div>
            <BarChart3 className="h-8 w-8 text-primary mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>פוזיציות פתוחות</CardTitle>
            <CardDescription>מספר הפוזיציות הפתוחות כרגע</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <div className="text-sm text-muted-foreground">פוזיציות במניות, מט"ח וסחורות</div>
            <DollarSign className="h-8 w-8 text-primary mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>חברים בקהילה</CardTitle>
            <CardDescription>מספר החברים הפעילים בקהילה</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,528</div>
            <div className="text-sm text-muted-foreground">משתמשים רשומים ופעילים</div>
            <Users className="h-8 w-8 text-primary mt-4" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>עדכונים וחדשות</CardTitle>
            <CardDescription>התראות ועדכונים חשובים</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <a href="/blog/123" className="text-primary hover:underline">סקירת שוק שבועית - מניות הטכנולוגיה</a>
                <div className="text-sm text-muted-foreground">פורסם לפני 3 שעות</div>
              </li>
              <li>
                <a href="/courses/456" className="text-primary hover:underline">קורס חדש: ניתוח טכני מתקדם</a>
                <div className="text-sm text-muted-foreground">הושק היום</div>
              </li>
              <li>
                <a href="/community" className="text-primary hover:underline">דיון חם בקהילה: השפעת האינפלציה על השוק</a>
                <div className="text-sm text-muted-foreground">פעיל במיוחד</div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>קישורים מהירים</CardTitle>
            <CardDescription>גישה מהירה לפעולות נפוצות</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start"><Calendar className="h-4 w-4 mr-2" /> לוח שנה</Button>
            <Button variant="outline" className="justify-start"><BookOpen className="h-4 w-4 mr-2" /> קורסים</Button>
            <Button variant="outline" className="justify-start"><MessageSquare className="h-4 w-4 mr-2" /> קהילה</Button>
            <Button variant="outline" className="justify-start"><TrendingUp className="h-4 w-4 mr-2" /> גרפים</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
