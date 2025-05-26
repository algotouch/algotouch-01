
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SubscriptionCard from '@/components/subscription/SubscriptionCard';
import { useAuth } from '@/contexts/auth';
import SubscriptionManager from '@/components/payment/SubscriptionManager';

const NoSubscriptionState = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <SubscriptionCard 
      title="אין לך מנוי פעיל" 
      description="הרשם עכשיו כדי לקבל גישה מלאה למערכת"
    >
      <div className="text-center py-6 space-y-4">
        <p className="text-muted-foreground pb-2">על מנת להשתמש במערכת, עליך לרכוש מנוי</p>
        
        <Button 
          onClick={() => navigate('/subscription')}
          size="lg"
          className="mx-auto"
        >
          בחר תכנית מנוי
        </Button>
        
        {user?.email && (
          <div className="pt-6 border-t mt-6">
            <SubscriptionManager 
              userId={user.id} 
              email={user.email}
              showRepairSuggestion={true}
            />
          </div>
        )}
        
        {!user?.email && (
          <div className="pt-6 border-t mt-6 text-sm text-muted-foreground">
            <p>אם אתה רואה את זה, נסה להתחבר מחדש</p>
            <p className="mt-1">אם אתה חושב שיש לך כבר מנוי, פנה לתמיכה</p>
          </div>
        )}
      </div>
    </SubscriptionCard>
  );
};

export default NoSubscriptionState;
