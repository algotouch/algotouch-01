
import React from 'react';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface PlanSelectionViewProps {
  onPlanSelect: (plan: string) => void;
  selectedPlan: string;
  onBackToAuth?: () => void;
}

const PlanSelectionView: React.FC<PlanSelectionViewProps> = ({ 
  onPlanSelect, 
  selectedPlan,
  onBackToAuth
}) => {
  return (
    <div className="space-y-6">
      {onBackToAuth && (
        <div className="flex justify-start">
          <Button 
            variant="outline" 
            onClick={onBackToAuth}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            חזור להרשמה
          </Button>
        </div>
      )}
      
      <SubscriptionPlans 
        onSelectPlan={onPlanSelect} 
        selectedPlanId={selectedPlan} 
      />
    </div>
  );
};

export default PlanSelectionView;
