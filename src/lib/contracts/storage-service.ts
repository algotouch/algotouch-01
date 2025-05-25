
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Calls the izidoc-sign edge function with proper error handling
 */
export async function callIzidocSignFunction(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    console.log('storage-service: Calling izidoc-sign edge function:', {
      userId, 
      planId, 
      email,
      fullName,
      hasSignature: !!contractData.signature,
      hasContractHtml: !!contractData.contractHtml,
      signatureLength: contractData.signature?.length || 0,
      contractHtmlLength: contractData.contractHtml?.length || 0
    });
    
    // Validate all required fields before calling the function
    if (!planId || !fullName || !email || !contractData?.signature || !contractData?.contractHtml) {
      const missingFields = {
        hasPlanId: !!planId,
        hasFullName: !!fullName,
        hasEmail: !!email,
        hasSignature: !!contractData?.signature,
        hasContractHtml: !!contractData?.contractHtml
      };
      console.error('storage-service: Missing required fields for edge function:', missingFields);
      return { 
        success: false, 
        error: { 
          error: 'Missing required fields', 
          details: missingFields 
        } 
      };
    }
    
    const requestBody = {
      userId: userId || crypto.randomUUID(), // Generate temp ID if no userId
      planId,
      fullName,
      email,
      signature: contractData.signature,
      contractHtml: contractData.contractHtml,
      agreedToTerms: contractData.agreedToTerms || false,
      agreedToPrivacy: contractData.agreedToPrivacy || false,
      contractVersion: contractData.contractVersion || "1.0",
      browserInfo: contractData.browserInfo || {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    console.log('storage-service: Invoking edge function with body keys:', Object.keys(requestBody));

    const { data, error } = await supabase.functions.invoke('izidoc-sign', {
      body: requestBody,
    });

    if (error) {
      console.error('storage-service: Error from izidoc-sign edge function:', error);
      return { success: false, error };
    }

    console.log('storage-service: Contract processed successfully by izidoc-sign:', data);
    return { success: true, data };
  } catch (error) {
    console.error('storage-service: Exception calling izidoc-sign function:', error);
    return { success: false, error };
  }
}

/**
 * Saves contract signature data directly to Supabase and sends emails
 */
export async function saveContractToDatabase(
  userId: string,
  planId: string,
  fullName: string,
  email: string,
  contractData: any
): Promise<{ success: boolean; data?: any; error?: any }> {
  // This function is kept for compatibility but should not be used directly
  // All contract processing should go through the edge function
  console.warn('saveContractToDatabase called directly - this should go through the edge function');
  return callIzidocSignFunction(userId, planId, fullName, email, contractData);
}

/**
 * Uploads contract HTML to storage bucket
 */
export async function uploadContractToStorage(
  userId: string,
  contractHtml: string,
  contractId: string
): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    console.log(`Uploading contract HTML to storage for user: ${userId}, contract: ${contractId}`);
    
    const fileName = `${userId}/${contractId}.html`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(contractHtml);
    
    const { data, error } = await supabase
      .storage
      .from('contracts')
      .upload(fileName, bytes, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading contract to storage:', error);
      return { success: false, error };
    }
    
    console.log('Contract uploaded successfully to storage:', data?.path);
    
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

/**
 * Updates user metadata with additional information
 */
async function updateUserMetadata(userId: string, metadata: any): Promise<boolean> {
  try {
    // We can't directly access auth.admin from the client,
    // so we'll update the profiles table instead
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        updated_at: new Date().toISOString(),
        ...metadata
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating user profile metadata:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception updating user metadata:', error);
    return false;
  }
}

/**
 * Updates subscription status with contract information
 */
export async function updateSubscriptionStatus(userId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        contract_signed: true,
        contract_signed_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error updating subscription status:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Exception updating subscription:', error);
    return { success: false, error };
  }
}

/**
 * Verifies if a contract has been signed
 */
export async function verifyContractSignature(userId: string): Promise<{ signed: boolean; signedAt?: string; contractId?: string }> {
  try {
    // First check the contract_signatures table
    const { data: contractData, error: contractError } = await supabase
      .from('contract_signatures')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .maybeSingle();
    
    if (contractData) {
      return { 
        signed: true,
        signedAt: contractData.created_at,
        contractId: contractData.id
      };
    }
    
    // If not found in contract table, check subscription table as fallback
    const { data, error } = await supabase
      .from('subscriptions')
      .select('contract_signed, contract_signed_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error verifying contract signature:', error);
      return { signed: false };
    }
    
    return { 
      signed: data?.contract_signed || false,
      signedAt: data?.contract_signed_at
    };
  } catch (error) {
    console.error('Exception verifying contract signature:', error);
    return { signed: false };
  }
}

/**
 * Gets a specific contract by ID
 */
export async function getContractById(contractId: string): Promise<{ success: boolean; contract?: any; error?: any }> {
  try {
    console.log('Fetching contract with ID:', contractId);
    const { data, error } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('id', contractId)
      .single();
    
    if (error) {
      console.error('Error retrieving contract:', error);
      return { success: false, error };
    }
    
    console.log('Contract retrieved successfully');
    return { success: true, contract: data };
  } catch (error) {
    console.error('Exception retrieving contract:', error);
    return { success: false, error };
  }
}
