import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth/AuthContext';

interface CompletionViewProps {
  onComplete: () => void;
}

const CompletionView: React.FC<CompletionViewProps> = ({ onComplete }) => {
  const { clearRegistrationData } = useAuth();

  const handleComplete = () => {
    clearRegistrationData();
    onComplete();
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>ההרשמה כמעט הסתיימה!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>תודה שנרשמת! כדי להשלים את ההרשמה, עליך לבחור תוכנית מנוי.</p>
        <Button onClick={handleComplete} className="w-full">
          בחר תוכנית מנוי
        </Button>
      </CardContent>
    </Card>
  );
};

export default CompletionView;

