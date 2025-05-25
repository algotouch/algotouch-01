
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
    console.log('Processing signed contract for user:', { userId, planId, email });
    
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
      console.error('Missing required parameters for processSignedContract:', missingData);
      toast.error('חסרים פרטים הכרחיים לעיבוד החוזה');
      return false;
    }
    
    // Validate userId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid userId format, must be UUID:', userId);
      toast.error('מזהה משתמש לא תקין');
      return false;
    }
    
    // Use the edge function for processing
    console.log('Using izidoc-sign edge function for contract processing');
    const { success, data, error } = await callIzidocSignFunction(
      userId, 
      planId, 
      fullName, 
      email, 
      contractData
    );
    
    if (success) {
      console.log('Contract processed successfully by edge function:', data);
      toast.success('ההסכם נחתם ונשמר בהצלחה! מייל אישור נשלח אליך');
      return data.documentId || data.contractId || true;
    } else {
      console.error('Edge function error:', error);
      const errorMessage = error?.error || error?.message || 'Unknown error';
      toast.error(`שגיאה בעיבוד החתימה: ${errorMessage}`);
      return false;
    }
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`שגיאה בעיבוד החתימה: ${errorMessage}`);
    return false;
  }
}

// Export other functions for backward compatibility
export * from './storage-service';
