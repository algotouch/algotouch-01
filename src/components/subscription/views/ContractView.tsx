
import React from 'react';
import ContractSection from '@/components/subscription/ContractSection';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { processSignedContract } from '@/lib/contracts/contract-service';

interface ContractViewProps {
  selectedPlan: string;
  fullName: string;
  onComplete: (contractId: string) => void;
  onBack: () => void;
}

const ContractView: React.FC<ContractViewProps> = ({
  selectedPlan,
  fullName,
  onComplete,
  onBack
}) => {
  const { user } = useAuth();

  const handleContractSign = async (contractData: any) => {
    // Additional validation to ensure we have a plan selected
    if (!selectedPlan) {
      console.error("Cannot sign contract: No plan selected");
      toast.error('אנא בחר תכנית מנוי תחילה');
      onBack();
      return;
    }
    
    // Validate that we have a fullName
    if (!fullName || fullName.trim() === '') {
      console.error("Cannot sign contract: No full name provided");
      toast.error('שם מלא נדרש לחתימת החוזה');
      return;
    }
    
    // Check if we have registration data in the session (for users in the signup flow)
    const registrationData = sessionStorage.getItem('registration_data');
    const isRegistering = registrationData ? true : false;

    // If user is not authenticated and we're not in the registration flow, show error
    if (!user?.id && !isRegistering) {
      console.error('User not authenticated and not in registration flow');
      toast.error('משתמש לא מזוהה. אנא התחבר או הירשם תחילה.');
      return;
    }
    
    console.log('Contract signing initiated', { 
      hasUserId: !!user?.id, 
      isRegistering, 
      planId: selectedPlan,
      fullName: fullName
    });
    
    // Add the plan ID to the contract data
    const enhancedContractData = {
      ...contractData,
      planId: selectedPlan,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Extract customer email for contract processing
    let customerEmail = user?.email;
    
    // If in registration flow, get email from registration data
    if (isRegistering && registrationData) {
      try {
        const parsedRegistrationData = JSON.parse(registrationData);
        customerEmail = parsedRegistrationData.email;
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }

    if (!customerEmail) {
      console.error('No customer email available for contract');
      toast.error('לא ניתן לזהות כתובת מייל. אנא נסה שוב.');
      return;
    }
    
    // Generate proper UUID for temp contract ID if in registration flow
    if (isRegistering) {
      enhancedContractData.tempContractId = crypto.randomUUID();
      console.log('Generated temp contract ID:', enhancedContractData.tempContractId);
      
      try {
        const parsedRegistrationData = JSON.parse(registrationData);
        parsedRegistrationData.contractDetails = enhancedContractData;
        parsedRegistrationData.planId = selectedPlan;
        sessionStorage.setItem('registration_data', JSON.stringify(parsedRegistrationData));
        console.log('Updated registration data with contract details');
      } catch (error) {
        console.error('Error updating registration data with contract:', error);
      }
    }

    try {
      // Use proper UUID for userId - either the authenticated user's ID or generate a proper UUID
      const userId = user?.id || crypto.randomUUID();
      console.log('Processing contract with userId:', userId, 'fullName:', fullName);
      
      // Validate required contract data before processing
      if (!enhancedContractData.signature || !enhancedContractData.contractHtml) {
        console.error('Missing required contract data:', {
          hasSignature: !!enhancedContractData.signature,
          hasContractHtml: !!enhancedContractData.contractHtml
        });
        toast.error('חסרים נתונים נדרשים לחתימה. אנא נסה שוב.');
        return;
      }
      
      const result = await processSignedContract(
        userId,
        selectedPlan,
        fullName, // Make sure fullName is passed correctly
        customerEmail,
        enhancedContractData
      );

      if (result) {
        console.log('Contract processed successfully:', result);
        const contractIdToUse = typeof result === 'string' ? result : enhancedContractData.tempContractId || 'processed';
        onComplete(contractIdToUse);
      } else {
        console.error('Failed to process contract');
        toast.error('שגיאה בעיבוד החוזה. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Exception processing contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`שגיאה בעיבוד החוזה: ${errorMessage}`);
    }
  };

  return (
    <ContractSection
      selectedPlan={selectedPlan}
      fullName={fullName}
      onSign={handleContractSign}
      onBack={onBack}
    />
  );
};

export default ContractView;
