import React, { useState, useEffect } from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';
import { AlertCircle, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth';
interface ContractSectionProps {
  selectedPlan: string;
  fullName: string;
  onSign: (contractData: any) => void;
  onBack: () => void;
}
const ContractSection: React.FC<ContractSectionProps> = ({
  selectedPlan,
  fullName,
  onSign,
  onBack
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    user,
    registrationData
  } = useAuth();

  // Log the received fullName for debugging
  useEffect(() => {
    console.log('ContractSection: Received props:', {
      selectedPlan,
      fullName,
      hasUser: !!user,
      hasRegistrationData: !!registrationData
    });
  }, [selectedPlan, fullName, user, registrationData]);

  // Function to handle contract signing
  const handleSignContract = async (contractData: any) => {
    try {
      setIsProcessing(true);
      console.log('ContractSection: Contract signed with data:', {
        hasSignature: !!contractData.signature,
        hasContractHtml: !!contractData.contractHtml,
        fullName,
        selectedPlan
      });

      // Add a small delay to show the processing state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Pass the contract data directly to the parent along with user information
      onSign({
        ...contractData,
        fullName,
        // Ensure fullName is passed through
        userId: user?.id // This will be undefined if the user isn't authenticated
      });
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  return <div className="space-y-6">
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          אנא קרא את ההסכם בעיון וחתום במקום המיועד בתחתית העמוד
        </AlertDescription>
      </Alert>

      {fullName}
      
      <DigitalContractForm onSign={handleSignContract} planId={selectedPlan} fullName={fullName} />
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          חזור
        </Button>
        
        {isProcessing && <div className="flex items-center text-sm text-muted-foreground">
            מעבד את החתימה...
          </div>}
      </div>
    </div>;
};
export default ContractSection;