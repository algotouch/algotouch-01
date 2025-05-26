
import { toast } from 'sonner';
import { callIzidocSignFunction } from './storage-service';

/**
 * Processes a signed contract using the edge function with enhanced error handling
 */
export async function processSignedContract(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<string | boolean> {
  try {
    console.log('contract-service: Processing signed contract for user:', { 
      userId, 
      planId, 
      email, 
      fullName,
      hasContractData: !!contractData,
      contractDataKeys: contractData ? Object.keys(contractData) : []
    });
    
    // Enhanced validation of inputs
    if (!planId || !email || !contractData || !fullName) {
      const missingData = { 
        hasPlanId: Boolean(planId), 
        hasEmail: Boolean(email),
        hasFullName: Boolean(fullName),
        hasContractData: Boolean(contractData),
        hasSignature: Boolean(contractData?.signature),
        hasContractHtml: Boolean(contractData?.contractHtml)
      };
      console.error('contract-service: Missing required parameters:', missingData);
      toast.error('חסרים פרטים הכרחיים לעיבוד החוזה');
      return false;
    }
    
    // Validate contract data structure
    if (!contractData.signature || !contractData.contractHtml) {
      console.error('contract-service: Invalid contract data structure:', {
        hasSignature: !!contractData.signature,
        hasContractHtml: !!contractData.contractHtml,
        signatureType: typeof contractData.signature,
        contractHtmlType: typeof contractData.contractHtml
      });
      toast.error('נתוני החוזה לא תקינים');
      return false;
    }
    
    console.log('contract-service: Validation passed, calling edge function...');
    
    // Use the edge function for processing with retry mechanism
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`contract-service: Attempt ${attempt}/2 to process contract`);
        
        const { success, data, error } = await callIzidocSignFunction(
          userId || crypto.randomUUID(),
          planId, 
          fullName, 
          email, 
          contractData
        );
        
        if (success) {
          console.log('contract-service: Contract processed successfully by edge function:', data);
          toast.success('ההסכם נחתם ונשמר בהצלחה!');
          return data?.documentId || data?.contractId || true;
        } else {
          console.error(`contract-service: Attempt ${attempt} failed:`, error);
          lastError = error;
          
          // Don't retry on validation errors
          if (error?.error?.includes('Missing required fields') || error?.error?.includes('Invalid')) {
            break;
          }
          
          // Wait before retry
          if (attempt < 2) {
            console.log('contract-service: Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (attemptError) {
        console.error(`contract-service: Attempt ${attempt} threw exception:`, attemptError);
        lastError = attemptError;
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // All attempts failed
    console.error('contract-service: All attempts failed, last error:', lastError);
    
    // Enhanced error messages based on error type
    let errorMessage = 'שגיאה לא ידועה';
    if (lastError?.error) {
      if (typeof lastError.error === 'string') {
        errorMessage = lastError.error;
      } else if (lastError.error.error) {
        errorMessage = lastError.error.error;
      }
    } else if (lastError?.message) {
      errorMessage = lastError.message;
    } else if (typeof lastError === 'string') {
      errorMessage = lastError;
    }
    
    // Special handling for known error types
    if (errorMessage.includes('non-2xx') || errorMessage.includes('Server error')) {
      toast.error('שירות החתימה זמנית לא זמין. אנא נסה שוב בעוד כמה דקות.');
    } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
      toast.error('בעיית חיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.');
    } else {
      toast.error(`שגיאה בעיבוד החתימה: ${errorMessage}`);
    }
    
    return false;
    
  } catch (error) {
    console.error('contract-service: Exception processing contract signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`שגיאה בעיבוד החתימה: ${errorMessage}`);
    return false;
  }
}

// Export other functions for backward compatibility
export * from './storage-service';
