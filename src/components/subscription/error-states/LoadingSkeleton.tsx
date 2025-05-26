
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { useAuth } from '@/contexts/auth';
import SubscriptionManager from '@/components/payment/SubscriptionManager';

const LoadingSkeleton = ({ showRepairSuggestion = true }) => {
  const { user } = useAuth();
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-8 w-[100px]" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-20 w-full max-w-[500px]" />
          </div>
        </div>
        
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-[180px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        
        {user?.email && showRepairSuggestion && (
          <div className="pt-4 border-t border-border">
            <SubscriptionManager 
              userId={user.id} 
              email={user.email}
              showRepairSuggestion={true}
            />
          </div>
        )}
        
        {!user?.email && showRepairSuggestion && (
          <div className="py-4 text-center text-sm text-muted-foreground border-t border-border">
            <p>אם אתה רואה את זה, נסה לרענן את הדף או להתחבר מחדש</p>
            <p className="mt-1">אם הבעיה נמשכת, פנה לתמיכה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoadingSkeleton;
