
import { toast } from 'sonner';
import { callIzidocSignFunction } from './storage-service';

/**
 * Processes a signed contract using the edge function only
 */
export async function processSignedContract(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<string | boolean> {
  try {
    console.log('contract-service: Processing signed contract for user:', { userId, planId, email, fullName });
    
    // Improved validation of inputs
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
    
    // Use the edge function for processing
    console.log('contract-service: Using izidoc-sign edge function for contract processing');
    const { success, data, error } = await callIzidocSignFunction(
      userId || crypto.randomUUID(), // Generate temp ID if no userId
      planId, 
      fullName, 
      email, 
      contractData
    );
    
    if (success) {
      console.log('contract-service: Contract processed successfully by edge function:', data);
      toast.success('ההסכם נחתם ונשמר בהצלחה!');
      return data.documentId || data.contractId || true;
    } else {
      console.error('contract-service: Edge function error:', error);
      
      // More detailed error messages
      let errorMessage = 'שגיאה לא ידועה';
      if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('contract-service: Detailed error:', errorMessage);
      toast.error(`שגיאה בעיבוד החתימה: ${errorMessage}`);
      return false;
    }
  } catch (error) {
    console.error('contract-service: Exception processing contract signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`שגיאה בעיבוד החתימה: ${errorMessage}`);
    return false;
  }
}

// Export other functions for backward compatibility
export * from './storage-service';
