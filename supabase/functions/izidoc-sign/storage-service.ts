
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function uploadContractToStorage(
  contractId: string,
  contractHtml: string
): Promise<string | null> {
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
    const fileName = `contracts/${contractId}.html`;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(contractHtml);
    
    console.log('izidoc-sign: Uploading contract to storage:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('contracts')
      .upload(fileName, bytes, {
        contentType: 'text/html',
        upsert: true
      });
    
    if (uploadError) {
      console.warn('izidoc-sign: Storage upload failed, continuing without URL:', uploadError);
      return null;
    }

    console.log('izidoc-sign: Contract uploaded to storage:', uploadData?.path);
    
    // Create a signed URL
    const { data: urlData } = await supabase
      .storage
      .from('contracts')
      .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days expiry
    
    const pdfUrl = urlData?.signedUrl;
    console.log('izidoc-sign: Created signed URL:', !!pdfUrl);
    
    return pdfUrl;
  } catch (storageError) {
    console.warn('izidoc-sign: Storage operation failed, continuing without URL:', storageError);
    return null;
  }
}
