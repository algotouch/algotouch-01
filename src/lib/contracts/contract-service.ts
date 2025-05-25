
import { toast } from 'sonner';
import { callIzidocSignFunction } from './storage-service';
import { sendContractEmails } from '@/services/contracts/contractEmailService';

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
    if (!userId || !planId || !email || !contractData || !fullName) {
      const missingData = { 
        hasUserId: Boolean(userId), 
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
    
    // Validate userId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('contract-service: Invalid userId format, must be UUID:', userId);
      toast.error('מזהה משתמש לא תקין');
      return false;
    }
    
    // Use the edge function for processing
    console.log('contract-service: Using izidoc-sign edge function for contract processing');
    const { success, data, error } = await callIzidocSignFunction(
      userId, 
      planId, 
      fullName, 
      email, 
      contractData
    );
    
    if (success) {
      console.log('contract-service: Contract processed successfully by edge function:', data);
      toast.success('ההסכם נחתם ונשמר בהצלחה! מייל אישור נשלח אליך');
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
