
import { toast } from 'sonner';
import { saveContractToDatabase, updateSubscriptionStatus, callIzidocSignFunction } from './storage-service';
import { sendContractEmails } from '@/services/contracts/contractEmailService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Processes a signed contract, saving it to the database and sending confirmation emails
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
    if (!userId || !planId || !email || !contractData) {
      console.error('Missing required parameters for processSignedContract:', { 
        hasUserId: Boolean(userId), 
        hasPlanId: Boolean(planId), 
        hasEmail: Boolean(email),
        hasContractData: Boolean(contractData)
      });
      toast.error('חסרים פרטים הכרחיים לעיבוד החוזה');
      return false;
    }
    
    // First try to use the edge function for processing
    console.log('Attempting to use izidoc-sign edge function');
    try {
      const { success, data, error } = await callIzidocSignFunction(
        userId, 
        planId, 
        fullName, 
        email, 
        contractData
      );
      
      if (success) {
        console.log('Contract processed successfully by edge function:', data);
        
        // Send contract emails
        await sendContractConfirmationEmails(
          email,
          fullName,
          data.documentId || data.contractId || 'unknown',
          planId,
          contractData.contractHtml || ''
        );
        
        toast.success('ההסכם נחתם ונשמר בהצלחה! מייל אישור נשלח אליך');
        return data.documentId || true;
      } else {
        console.error('Edge function error:', error);
        console.log('Falling back to client-side processing');
      }
    } catch (edgeFunctionError) {
      console.error('Edge function call failed:', edgeFunctionError);
      console.log('Falling back to client-side processing');
    }
    
    // Fallback to client-side processing
    console.log('Using client-side fallback for contract processing');
    const saveResult = await saveContractToDatabase(userId, planId, fullName, email, contractData);
    
    if (!saveResult.success) {
      console.error('Error saving contract:', saveResult.error);
      toast.error('שגיאה בשמירת החתימה');
      return false;
    }
    
    // Return the contract ID for potential redirects to view the contract
    const contractId = saveResult.data?.id;
    console.log('Contract saved with ID:', contractId);
    
    // Send contract emails
    if (contractId) {
      await sendContractConfirmationEmails(
        email,
        fullName,
        contractId,
        planId,
        contractData.contractHtml || ''
      );
    }
    
    // Try to update the subscription status
    await updateSubscriptionStatus(userId);
    
    toast.success('ההסכם נחתם ונשמר בהצלחה! מייל אישור נשלח אליך');
    return contractId || true;
  } catch (error) {
    console.error('Exception processing contract signature:', error);
    toast.error('שגיאה בעיבוד החתימה');
    return false;
  }
}

/**
 * Sends contract confirmation emails to customer and support
 */
async function sendContractConfirmationEmails(
  customerEmail: string,
  customerName: string,
  contractId: string,
  planId: string,
  contractHtml: string
): Promise<void> {
  try {
    console.log('Sending contract confirmation emails');
    
    const emailResult = await sendContractEmails({
      customerEmail,
      customerName,
      contractId,
      contractHtml,
      planId,
      signedAt: new Date().toISOString()
    });
    
    if (emailResult.success) {
      console.log('Contract emails sent successfully');
    } else {
      console.error('Error sending contract emails:', emailResult.error);
      // Don't throw error here as the contract is already saved
      toast.warning('החוזה נשמר אך יתכן שהמייל לא נשלח. נא פנה לתמיכה');
    }
  } catch (error) {
    console.error('Exception sending contract emails:', error);
    // Don't throw error here as the contract is already saved
    toast.warning('החוזה נשמר אך יתכן שהמייל לא נשלח. נא פנה לתמיכה');
  }
}

// Upload contract HTML to storage bucket
export async function uploadContractToStorage(
  userId: string,
  contractHtml: string,
  contractId: string
): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    console.log(`Uploading contract HTML to storage for user: ${userId}, contract: ${contractId}`);
    
    // Generate a file name based on contract ID
    const fileName = `${userId}/${contractId}.html`;
    
    // Upload the file to the contracts bucket
    const { data, error } = await supabase
      .storage
      .from('contracts')
      .upload(fileName, contractHtml, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading contract to storage:', error);
      return { success: false, error };
    }
    
    console.log('Contract uploaded successfully to storage:', data?.path);
    
    // Create a URL for accessing the contract
    const { data: urlData } = await supabase
      .storage
      .from('contracts')
      .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days expiry
    
    return { 
      success: true, 
      url: urlData?.signedUrl
    };
  } catch (error) {
    console.error('Exception uploading contract to storage:', error);
    return { success: false, error };
  }
}

// Export other functions for backward compatibility
export * from './storage-service';
