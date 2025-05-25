
import React, { useState } from 'react';
import ContractSection from '@/components/subscription/ContractSection';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { processSignedContract } from '@/lib/contracts/contract-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
  const { user, registrationData } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Get fullName from multiple sources with fallback priority
  const getFullName = () => {
    console.log('ContractView: Getting full name from sources:', {
      propFullName: fullName,
      registrationData: registrationData?.userData,
      userProfile: { user: !!user }
    });

    // Priority 1: Passed fullName prop
    if (fullName && fullName.trim() !== '') {
      console.log('ContractView: Using fullName from props:', fullName);
      return fullName.trim();
    }

    // Priority 2: Registration data
    if (registrationData?.userData) {
      const { firstName, lastName } = registrationData.userData;
      const regFullName = `${firstName || ''} ${lastName || ''}`.trim();
      if (regFullName) {
        console.log('ContractView: Using fullName from registration data:', regFullName);
        return regFullName;
      }
    }
    console.warn('ContractView: No fullName available from any source');
    return '';
  };

  const effectiveFullName = getFullName();

  const handleContractSign = async (contractData: any) => {
    console.log('ContractView: Contract signing initiated with data:', {
      hasSignature: !!contractData.signature,
      hasContractHtml: !!contractData.contractHtml,
      effectiveFullName,
      selectedPlan,
      hasUser: !!user?.id,
      hasRegistrationData: !!registrationData
    });

    // Reset previous error
    setLastError(null);

    // Validate that we have a plan selected
    if (!selectedPlan) {
      console.error("Cannot sign contract: No plan selected");
      toast.error('אנא בחר תכנית מנוי תחילה');
      onBack();
      return;
    }

    // Validate that we have a fullName
    if (!effectiveFullName || effectiveFullName.trim() === '') {
      console.error("Cannot sign contract: No full name available from any source");
      toast.error('שם מלא נדרש לחתימת החוזה. אנא וודא שמילאת את השדות הנדרשים.');
      return;
    }

    // Check if we have registration data in the session (for users in the signup flow)
    const registrationDataFromSession = sessionStorage.getItem('registration_data');
    const isRegistering = registrationDataFromSession ? true : false;

    // If user is not authenticated and we're not in the registration flow, show error
    if (!user?.id && !isRegistering) {
      console.error('User not authenticated and not in registration flow');
      toast.error('משתמש לא מזוהה. אנא התחבר או הירשם תחילה.');
      return;
    }

    console.log('Contract signing proceeding with:', {
      hasUserId: !!user?.id,
      isRegistering,
      planId: selectedPlan,
      fullName: effectiveFullName
    });

    // Add the plan ID to the contract data
    const enhancedContractData = {
      ...contractData,
      planId: selectedPlan,
      fullName: effectiveFullName,
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
    if (isRegistering && registrationDataFromSession) {
      try {
        const parsedRegistrationData = JSON.parse(registrationDataFromSession);
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
        const parsedRegistrationData = JSON.parse(registrationDataFromSession);
        parsedRegistrationData.contractDetails = enhancedContractData;
        parsedRegistrationData.planId = selectedPlan;
        sessionStorage.setItem('registration_data', JSON.stringify(parsedRegistrationData));
        console.log('Updated registration data with contract details');
      } catch (error) {
        console.error('Error updating registration data with contract:', error);
      }
    }

    try {
      const userId = user?.id || crypto.randomUUID();
      console.log('Processing contract with userId:', userId, 'fullName:', effectiveFullName);

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
        effectiveFullName,
        customerEmail, 
        enhancedContractData
      );

      if (result) {
        console.log('Contract processed successfully:', result);
        const contractIdToUse = typeof result === 'string' ? result : enhancedContractData.tempContractId || 'processed';
        onComplete(contractIdToUse);
      } else {
        console.error('Failed to process contract');
        setLastError('שגיאה בעיבוד החוזה. יש לנסות שוב.');
        toast.error('שגיאה בעיבוד החוזה. אנא נסה שוב.');
      }
    } catch (error) {
      console.error('Exception processing contract:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastError(`שגיאה בעיבוד החוזה: ${errorMessage}`);
      toast.error(`שגיאה בעיבוד החוזה: ${errorMessage}`);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setLastError(null);
    
    // Wait a moment and then trigger a page refresh to reset state
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // If no fullName available, show error
  if (!effectiveFullName) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            חסר שם מלא
          </h3>
          <p className="text-muted-foreground mb-4">
            לא ניתן להמשיך בחתימת החוזה ללא שם מלא. אנא חזור ומלא את הפרטים הנדרשים.
          </p>
          <Button onClick={onBack} className="btn btn-primary">
            חזור למילוי פרטים
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{lastError}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              disabled={isRetrying}
              className="mr-2"
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'נסה שוב'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <ContractSection 
        selectedPlan={selectedPlan} 
        fullName={effectiveFullName} 
        onSign={handleContractSign} 
        onBack={onBack} 
      />
    </div>
  );
};

export default ContractView;
