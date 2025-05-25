
import { supabase } from '@/integrations/supabase/client';
import { ContractSignatureData } from '@/types/payment';

export class SecureSignatureService {
  static async storeSignature(
    userId: string,
    planId: string,
    userDetails: {
      fullName: string;
      email: string;
      phone?: string;
    },
    signatureData: ContractSignatureData
  ) {
    try {
      const { error } = await supabase
        .from('contract_signatures')
        .insert({
          user_id: userId,
          plan_id: planId,
          full_name: userDetails.fullName,
          email: userDetails.email,
          phone: userDetails.phone || null,
          signature: signatureData.signature || '',
          contract_html: signatureData.contractHtml || '',
          contract_version: signatureData.contractVersion || '1.0',
          agreed_to_terms: signatureData.agreedToTerms || false,
          agreed_to_privacy: signatureData.agreedToPrivacy || false,
          browser_info: signatureData.browserInfo || null
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error storing signature:', error);
      return { success: false, error };
    }
  }
}
