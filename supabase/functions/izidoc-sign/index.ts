
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractSignRequest {
  userId: string;
  planId: string;
  fullName: string;
  email: string;
  signature: string;
  contractHtml: string;
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
  contractVersion?: string;
  browserInfo?: any;
}

// Function to enhance contract HTML with signature details
function enhanceContractWithSignatureDetails(
  originalHtml: string,
  fullName: string,
  email: string,
  planId: string,
  signature: string,
  signedAt: string,
  contractId: string,
  browserInfo: any
): string {
  console.log('izidoc-sign: Enhancing contract HTML with signature details');
  
  // Create signature section HTML
  const signatureSection = `
    <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #333; page-break-inside: avoid;">
      <h3 style="text-align: center; margin-bottom: 30px; color: #333; font-family: Arial, sans-serif;">פרטי החתימה</h3>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-family: Arial, sans-serif;">
        <div style="flex: 1; margin-left: 20px;">
          <h4 style="color: #666; margin-bottom: 10px;">פרטי החותם:</h4>
          <p style="margin: 5px 0;"><strong>שם מלא:</strong> ${fullName}</p>
          <p style="margin: 5px 0;"><strong>אימייל:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>תכנית:</strong> ${planId}</p>
        </div>
        
        <div style="flex: 1;">
          <h4 style="color: #666; margin-bottom: 10px;">פרטי החתימה:</h4>
          <p style="margin: 5px 0;"><strong>תאריך חתימה:</strong> ${new Date(signedAt).toLocaleString('he-IL')}</p>
          <p style="margin: 5px 0;"><strong>מזהה חוזה:</strong> ${contractId}</p>
          <p style="margin: 5px 0;"><strong>גרסת חוזה:</strong> 1.0</p>
        </div>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h4 style="color: #666; margin-bottom: 15px; font-family: Arial, sans-serif;">חתימה דיגיטלית:</h4>
        <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9; text-align: center; min-height: 120px; display: flex; align-items: center; justify-content: center;">
          <img src="${signature}" alt="חתימה דיגיטלית" style="max-height: 100px; max-width: 300px;" />
        </div>
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 10px;">
          חתימה דיגיטלית מאומתת - ${new Date(signedAt).toLocaleString('he-IL')}
        </p>
      </div>
      
      <div style="margin-top: 30px; font-size: 11px; color: #888; font-family: Arial, sans-serif;">
        <h5 style="color: #666; margin-bottom: 10px;">מידע טכני:</h5>
        <p style="margin: 3px 0;">כתובת IP: ${browserInfo?.ipAddress || 'לא זמין'}</p>
        <p style="margin: 3px 0;">דפדפן: ${browserInfo?.userAgent || 'לא זמין'}</p>
        <p style="margin: 3px 0;">שפה: ${browserInfo?.language || 'he-IL'}</p>
        <p style="margin: 3px 0;">אזור זמן: ${browserInfo?.timeZone || 'Asia/Jerusalem'}</p>
        <p style="margin: 3px 0;">גודל מסך: ${browserInfo?.screenSize || 'לא זמין'}</p>
      </div>
      
      <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #aaa;">
        חוזה זה נחתם באופן דיגיטלי ומאומת על ידי המערכת
      </div>
    </div>
  `;
  
  // Insert the signature section before the closing body tag
  const enhancedHtml = originalHtml.replace('</body>', `${signatureSection}</body>`);
  
  console.log('izidoc-sign: Contract HTML enhanced successfully');
  return enhancedHtml;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('izidoc-sign: Request received, parsing body...');
    
    const requestBody = await req.json();
    console.log('izidoc-sign: Request body keys:', Object.keys(requestBody));
    
    const {
      userId,
      planId,
      fullName,
      email,
      signature,
      contractHtml,
      agreedToTerms = false,
      agreedToPrivacy = false,
      contractVersion = "1.0",
      browserInfo
    }: ContractSignRequest = requestBody;

    console.log('izidoc-sign: Processing contract signing request:', {
      userId,
      planId,
      email,
      fullName,
      hasSignature: !!signature,
      hasContractHtml: !!contractHtml,
      signatureLength: signature?.length || 0,
      contractHtmlLength: contractHtml?.length || 0
    });

    // Validate required inputs with detailed logging
    const missingFields = [];
    if (!planId) missingFields.push('planId');
    if (!email) missingFields.push('email');
    if (!signature) missingFields.push('signature');
    if (!contractHtml) missingFields.push('contractHtml');
    if (!fullName) missingFields.push('fullName');

    if (missingFields.length > 0) {
      console.error('izidoc-sign: Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          details: { missingFields }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Initialize Supabase client with service role key for admin operations
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

    // Generate a unique contract ID
    const contractId = crypto.randomUUID();
    const signedAt = new Date().toISOString();
    console.log('izidoc-sign: Generated contract ID:', contractId);

    // Enhance contract HTML with signature details
    const enhancedContractHtml = enhanceContractWithSignatureDetails(
      contractHtml,
      fullName,
      email,
      planId,
      signature,
      signedAt,
      contractId,
      browserInfo
    );

    // Try to upload enhanced HTML to storage
    let pdfUrl = null;
    try {
      const fileName = `contracts/${contractId}.html`;
      const encoder = new TextEncoder();
      const bytes = encoder.encode(enhancedContractHtml);
      
      console.log('izidoc-sign: Uploading enhanced contract to storage:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('contracts')
        .upload(fileName, bytes, {
          contentType: 'text/html',
          upsert: true
        });
      
      if (uploadError) {
        console.warn('izidoc-sign: Storage upload failed, continuing without URL:', uploadError);
      } else {
        console.log('izidoc-sign: Enhanced contract uploaded to storage:', uploadData?.path);
        
        // Create a signed URL
        const { data: urlData } = await supabase
          .storage
          .from('contracts')
          .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days expiry
        
        pdfUrl = urlData?.signedUrl;
        console.log('izidoc-sign: Created signed URL:', !!pdfUrl);
      }
    } catch (storageError) {
      console.warn('izidoc-sign: Storage operation failed, continuing without URL:', storageError);
    }

    // Store contract signature in database
    console.log('izidoc-sign: Saving contract to database...');
    
    const { data, error } = await supabase
      .from('contract_signatures')
      .insert({
        id: contractId,
        user_id: userId || null,
        plan_id: planId,
        full_name: fullName,
        email: email,
        signature: signature,
        contract_html: enhancedContractHtml, // Save the enhanced HTML
        agreed_to_terms: agreedToTerms,
        agreed_to_privacy: agreedToPrivacy,
        contract_version: contractVersion,
        pdf_url: pdfUrl,
        contract_signed_at: signedAt,
        browser_info: browserInfo || {
          userAgent: req.headers.get('user-agent') || 'unknown',
          language: 'he-IL',
          timeZone: 'Asia/Jerusalem'
        }
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('izidoc-sign: Error saving contract signature:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database error while saving contract',
          details: error.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log('izidoc-sign: Contract signature saved successfully:', data);

    // Update user metadata in auth.users table with contract details
    if (userId) {
      try {
        console.log('izidoc-sign: Updating user metadata with contract details');
        
        const contractMetadata = {
          contract_signed: true,
          contract_id: contractId,
          contract_signed_at: signedAt,
          plan_id: planId,
          full_name: fullName,
          contract_version: contractVersion,
          contract_url: pdfUrl
        };

        const { error: metadataError } = await supabase.auth.admin.updateUserById(
          userId,
          {
            user_metadata: contractMetadata
          }
        );

        if (metadataError) {
          console.warn('izidoc-sign: Failed to update user metadata:', metadataError);
        } else {
          console.log('izidoc-sign: User metadata updated successfully with contract details');
        }
      } catch (metadataError) {
        console.warn('izidoc-sign: Exception updating user metadata:', metadataError);
      }
    }

    console.log('izidoc-sign: Contract processing completed successfully');

    // Return success with enhanced contract details
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contractId: contractId,
          documentId: contractId,
          signedAt: signedAt,
          enhancedContractUrl: pdfUrl,
          fullName: fullName,
          email: email,
          planId: planId
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("izidoc-sign: Error in function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
