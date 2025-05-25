
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
  ipAddress?: string;
  signedAt?: string;
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
      browserInfo,
      ipAddress,
      signedAt
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
    console.log('izidoc-sign: Generated contract ID:', contractId);

    // Create enhanced contract HTML with signing details
    const signedAt = new Date().toISOString();
    const signedAtDisplay = new Date().toLocaleString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Append signing details to the contract HTML
    const signingDetailsHTML = `
      <div style="page-break-before: always; margin-top: 40px; padding: 20px; border-top: 2px solid #333;">
        <h2 style="text-align: center; color: #2563eb; margin-bottom: 30px; font-family: Arial, sans-serif;">
          פרטי החתימה הדיגיטלית
        </h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e40af; margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">
              פרטי החותם
            </h3>
            <p><strong>שם מלא:</strong> ${fullName}</p>
            <p><strong>כתובת דואר אלקטרוני:</strong> ${email}</p>
            <p><strong>תוכנית מנוי:</strong> ${planId}</p>
            <p><strong>גרסת חוזה:</strong> ${contractVersion}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h3 style="color: #1e40af; margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">
              פרטי החתימה
            </h3>
            <p><strong>תאריך וזמן חתימה:</strong> ${signedAtDisplay}</p>
            <p><strong>כתובת IP:</strong> ${ipAddress || 'לא זמין'}</p>
            <p><strong>הסכמה לתנאים:</strong> ${agreedToTerms ? 'כן' : 'לא'}</p>
            <p><strong>הסכמה לפרטיות:</strong> ${agreedToPrivacy ? 'כן' : 'לא'}</p>
          </div>
        </div>
        
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 30px;">
          <h3 style="color: #1e40af; margin-bottom: 15px; border-bottom: 1px solid #94a3b8; padding-bottom: 5px;">
            פרטים טכניים
          </h3>
          <div style="font-size: 12px; color: #475569;">
            <p><strong>דפדפן:</strong> ${browserInfo?.userAgent || 'לא זמין'}</p>
            <p><strong>שפה:</strong> ${browserInfo?.language || 'לא זמין'}</p>
            <p><strong>פלטפורמה:</strong> ${browserInfo?.platform || 'לא זמין'}</p>
            <p><strong>רזולוציית מסך:</strong> ${browserInfo?.screenSize || 'לא זמין'}</p>
            <p><strong>אזור זמן:</strong> ${browserInfo?.timeZone || 'לא זמין'}</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h3 style="color: #1e40af; margin-bottom: 15px;">החתימה הדיגיטלית</h3>
          <div style="border: 2px solid #cbd5e1; border-radius: 8px; padding: 20px; background: white; display: inline-block;">
            <img src="${signature}" alt="חתימה דיגיטלית" style="max-width: 300px; max-height: 150px;"/>
          </div>
          <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
            חתימה דיגיטלית מאומתת - ${signedAtDisplay}
          </p>
        </div>
        
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; font-size: 12px; color: #1e40af;">
            <strong>הצהרת אמיתות:</strong> אני מאשר כי קראתי והבנתי את תנאי ההסכם, 
            וכי החתימה הדיגיטלית שלעיל נעשתה על ידי במועד ובמקום המצוינים לעיל.
            חוזה זה נחתם באופן דיגיטלי ומהווה מסמך משפטי מחייב.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #6b7280;">
          <p>מזהה חוזה: ${contractId}</p>
          <p>נוצר על ידי מערכת TraderVue - ${signedAtDisplay}</p>
        </div>
      </div>
    `;

    // Combine original contract with signing details
    const enhancedContractHtml = contractHtml + signingDetailsHTML;

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

    // Store contract signature in database with enhanced HTML
    console.log('izidoc-sign: Saving enhanced contract to database...');
    
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
        ip_address: ipAddress,
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

    // Update user metadata in Supabase Auth
    if (userId) {
      try {
        const { error: metadataError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            contract_signed: true,
            contract_id: contractId,
            plan_id: planId,
            contract_signed_at: signedAt,
            contract_version: contractVersion
          }
        });

        if (metadataError) {
          console.warn('izidoc-sign: Could not update user metadata:', metadataError);
        } else {
          console.log('izidoc-sign: User metadata updated successfully');
        }
      } catch (metadataError) {
        console.warn('izidoc-sign: Exception updating user metadata:', metadataError);
      }
    }

    console.log('izidoc-sign: Enhanced contract signature saved successfully:', data);
    console.log('izidoc-sign: Contract processing completed successfully with enhanced details');

    // Return success with enhanced contract information
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contractId: contractId,
          documentId: contractId,
          signedAt: data.created_at,
          enhancedHtml: true,
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
