import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth/AuthContext';

interface NoSubscriptionStateProps {
  onSubscribe: () => void;
}

const NoSubscriptionState: React.FC<NoSubscriptionStateProps> = ({ onSubscribe }) => {
  const { registrationData } = useAuth();
  
  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>אין לך מנוי פעיל</CardTitle>
        <CardDescription>
          הירשם עכשיו כדי לקבל גישה מלאה לכל הפיצ'רים
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Badge variant="secondary">גישה מוגבלת</Badge>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          כדי לקבל גישה מלאה לכל הכלים והתכנים שלנו, אנא בחר תוכנית מנוי.
        </p>
      </CardContent>
      <Button onClick={onSubscribe} className="w-full justify-start gap-2">
        {registrationData ? 'המשך לבחירת תוכנית' : 'בחר תוכנית מנוי'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
};

export default NoSubscriptionState;

