
import React from 'react';
import PlanSelectionView from './PlanSelectionView';
import ContractView from './ContractView';
import CompletionView from './CompletionView';
import { Steps } from '../../../types/subscription';
import PaymentSection from '../payment/PaymentSection';

interface SubscriptionViewProps {
  currentStep: Steps;
  selectedPlan: string;
  fullName: string;
  onPlanSelect: (plan: string) => void;
  onContractSign: (contractId: string) => void;
  onPaymentComplete: () => void;
  onBack: (step: Steps) => void;
  onBackToAuth?: () => void;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  currentStep,
  selectedPlan,
  fullName,
  onPlanSelect,
  onContractSign,
  onPaymentComplete,
  onBack,
  onBackToAuth,
}) => {
  switch (currentStep) {
    case 'plan-selection':
      return (
        <PlanSelectionView 
          onPlanSelect={onPlanSelect}
          selectedPlan={selectedPlan}
          onBackToAuth={onBackToAuth}
        />
      );
    case 'contract':
      return (
        <ContractView
          selectedPlan={selectedPlan}
          fullName={fullName}
          onComplete={onContractSign}
          onBack={() => onBack('plan-selection')}
        />
      );
    case 'payment':
      return (
        <PaymentSection
          selectedPlan={selectedPlan}
          onPaymentComplete={onPaymentComplete}
          onBack={() => onBack('contract')}
        />
      );
    case 'completion':
      return (
        <CompletionView planId={selectedPlan} />
      );
    default:
      return <PlanSelectionView 
        onPlanSelect={onPlanSelect}
        selectedPlan={selectedPlan}
        onBackToAuth={onBackToAuth}
      />;
  }
};

export default SubscriptionView;
