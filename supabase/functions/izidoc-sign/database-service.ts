
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ContractSignRequest } from "./types.ts";

export async function saveContractSignature(
  contractId: string,
  requestData: ContractSignRequest,
  pdfUrl: string | null
) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data, error } = await supabase
    .from('contract_signatures')
    .insert({
      id: contractId,
      user_id: requestData.userId || null,
      plan_id: requestData.planId,
      full_name: requestData.fullName,
      email: requestData.email,
      signature: requestData.signature,
      contract_html: requestData.contractHtml,
      agreed_to_terms: requestData.agreedToTerms || false,
      agreed_to_privacy: requestData.agreedToPrivacy || false,
      contract_version: requestData.contractVersion || "1.0",
      pdf_url: pdfUrl,
      browser_info: requestData.browserInfo || {
        userAgent: 'unknown',
        language: 'he-IL',
        timeZone: 'Asia/Jerusalem'
      }
    })
    .select('id, created_at')
    .single();

  return { data, error };
}

export async function logEmailFailure(
  contractId: string,
  email: string,
  fullName: string,
  planId: string,
  error: any
) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        function_name: 'izidoc-sign.email_sending',
        message: 'Failed to send contract email',
        details: {
          contractId,
          email,
          fullName,
          planId,
          error,
          timestamp: new Date().toISOString()
        }
      });
    
    console.log('izidoc-sign: Email failure logged to system_logs for later retry');
  } catch (logError) {
    console.warn('izidoc-sign: Failed to log email error:', logError);
  }
}
