
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

    // Enhance the contract HTML with signing details
    const enhancedContractHtml = enhanceContractWithSigningDetails(
      contractHtml, 
      {
        contractId,
        signedAt,
        fullName,
        email,
        planId,
        signature,
        browserInfo,
        agreedToTerms,
        agreedToPrivacy,
        contractVersion
      }
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
        console.log('izidoc-sign: Contract uploaded to storage:', uploadData?.path);
        
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

    // Update user metadata in Supabase Auth if userId exists
    if (userId) {
      try {
        console.log('izidoc-sign: Updating user metadata...');
        
        const contractInfo = {
          contractId,
          signedAt,
          planId,
          fullName,
          email,
          contractVersion,
          agreedToTerms,
          agreedToPrivacy,
          pdfUrl
        };

        // Update user metadata using admin client
        const { error: metadataError } = await supabase.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              ...contractInfo,
              lastContractSigned: signedAt,
              contractSigned: true
            }
          }
        );

        if (metadataError) {
          console.warn('izidoc-sign: Failed to update user metadata:', metadataError);
        } else {
          console.log('izidoc-sign: User metadata updated successfully');
        }
      } catch (metadataUpdateError) {
        console.warn('izidoc-sign: Exception updating user metadata:', metadataUpdateError);
      }
    }

    console.log('izidoc-sign: Contract processing completed successfully');

    // Return success with contract details
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contractId: contractId,
          documentId: contractId,
          signedAt: data.created_at,
          pdfUrl: pdfUrl
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

// Function to enhance contract HTML with signing details
function enhanceContractWithSigningDetails(originalHtml: string, signingDetails: any): string {
  const {
    contractId,
    signedAt,
    fullName,
    email,
    planId,
    signature,
    browserInfo,
    agreedToTerms,
    agreedToPrivacy,
    contractVersion
  } = signingDetails;

  const signedDate = new Date(signedAt);
  const hebrewDate = signedDate.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Enhanced signing details section to append to the contract
  const signingDetailsSection = `
    <div class="signing-details" style="margin-top: 40px; padding: 20px; border: 2px solid #2563eb; border-radius: 8px; background-color: #f8fafc;">
      <h2 style="color: #2563eb; margin-bottom: 20px; text-align: center;">פרטי החתימה הדיגיטלית</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <strong>מספר חוזה:</strong><br>
          <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${contractId}</span>
        </div>
        <div>
          <strong>תאריך וזמן חתימה:</strong><br>
          ${hebrewDate}
        </div>
        <div>
          <strong>שם החותם:</strong><br>
          ${fullName}
        </div>
        <div>
          <strong>כתובת אימייל:</strong><br>
          ${email}
        </div>
        <div>
          <strong>חבילת מנוי:</strong><br>
          ${planId === 'monthly' ? 'חבילה חודשית' : planId === 'annual' ? 'חבילה שנתית' : planId}
        </div>
        <div>
          <strong>גרסת חוזה:</strong><br>
          ${contractVersion}
        </div>
      </div>

      <div style="margin: 20px 0; text-align: center;">
        <h3 style="color: #374151; margin-bottom: 10px;">חתימה דיגיטלית</h3>
        <div style="border: 2px dashed #9ca3af; padding: 20px; background: white; border-radius: 8px; min-height: 100px; display: flex; align-items: center; justify-content: center;">
          <img src="${signature}" alt="חתימה דיגיטלית" style="max-width: 300px; max-height: 100px;" />
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h3 style="color: #374151; margin-bottom: 10px;">אישורים</h3>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px;">
          <p>✅ אישור תנאי השירות: ${agreedToTerms ? 'כן' : 'לא'}</p>
          <p>✅ אישור מדיניות הפרטיות: ${agreedToPrivacy ? 'כן' : 'לא'}</p>
        </div>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 6px; font-size: 12px; color: #6b7280;">
        <h4 style="color: #374151; margin-bottom: 10px;">מידע טכני לאימות</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
          <div><strong>כתובת IP:</strong> ${browserInfo?.ipAddress || 'לא זמין'}</div>
          <div><strong>דפדפן:</strong> ${browserInfo?.userAgent?.split(' ')[0] || 'לא זמין'}</div>
          <div><strong>שפה:</strong> ${browserInfo?.language || 'לא זמין'}</div>
          <div><strong>אזור זמן:</strong> ${browserInfo?.timeZone || 'לא זמין'}</div>
          <div><strong>רזולוציה:</strong> ${browserInfo?.screenSize || 'לא זמין'}</div>
          <div><strong>זמן UTC:</strong> ${signedDate.toISOString()}</div>
        </div>
      </div>

      <div style="margin-top: 20px; text-align: center; font-size: 11px; color: #9ca3af;">
        <p>חוזה זה נחתם באמצעות מערכת חתימה דיגיטלית מאובטחת של TraderVue</p>
        <p>המידע הטכני לעיל משמש לאימות זהות החותם ותקפות החתימה</p>
      </div>
    </div>`;

  // Insert the signing details before the closing body tag
  if (originalHtml.includes('</body>')) {
    return originalHtml.replace('</body>', signingDetailsSection + '\n</body>');
  } else {
    // If no closing body tag, append to the end
    return originalHtml + signingDetailsSection;
  }
}
