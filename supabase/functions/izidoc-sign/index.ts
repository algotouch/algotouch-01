
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
    console.log('izidoc-sign: Generated contract ID:', contractId);

    // Try to upload HTML to storage first (optional step)
    let pdfUrl = null;
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

    // Store contract signature in database - now without foreign key dependency
    console.log('izidoc-sign: Saving contract to database...');
    
    const { data, error } = await supabase
      .from('contract_signatures')
      .insert({
        id: contractId,
        user_id: userId || null, // Now nullable, so we can handle cases where user doesn't exist yet
        plan_id: planId,
        full_name: fullName,
        email: email,
        signature: signature,
        contract_html: contractHtml,
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

    // Send contract email via SMTP
    try {
      console.log('izidoc-sign: Sending contract email via SMTP...');
      
      // Convert contract HTML to base64 for attachment
      const encoder = new TextEncoder();
      const contractBytes = encoder.encode(contractHtml);
      const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));

      // Customer email template
      const customerEmailHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>אישור חתימת חוזה</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .content { line-height: 1.6; color: #333; }
            .highlight { background-color: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">AlgoTouch</div>
              <h1>אישור חתימת חוזה</h1>
            </div>
            
            <div class="content">
              <p>שלום ${fullName},</p>
              
              <p>תודה שבחרת ב-AlgoTouch! אנו שמחים לאשר שחתמת בהצלחה על החוזה עבור תכנית ${planId}.</p>
              
              <div class="highlight">
                <strong>פרטי החוזה:</strong><br>
                מזהה חוזה: ${contractId}<br>
                תאריך חתימה: ${new Date(data.created_at).toLocaleDateString('he-IL')}<br>
                תכנית: ${planId}
              </div>
              
              <p>החוזה החתום נשמר במערכת שלנו וניתן לצפות בו בכל עת דרך האזור האישי שלך.</p>
              
              <p>אם יש לך שאלות או צריך עזרה, אנא פנה אלינו:</p>
              <ul>
                <li>מייל: support@algotouch.co.il</li>
              </ul>
              
              <p>בברכה,<br>צוות AlgoTouch</p>
            </div>
            
            <div class="footer">
              <p>מייל זה נשלח אוטומטית ממערכת AlgoTouch. אנא אל תשיב למייל זה.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send email via SMTP edge function
      const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/smtp-sender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to: email,
          subject: 'אישור חתימת חוזה - AlgoTouch',
          html: customerEmailHtml,
          attachmentData: [{
            filename: `contract-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.html`,
            content: contractBase64,
            mimeType: "text/html"
          }]
        }),
      });

      const emailResult = await emailResponse.json();
      
      if (emailResult.success) {
        console.log('izidoc-sign: Contract email sent successfully to customer');
      } else {
        console.warn('izidoc-sign: Failed to send customer email:', emailResult.error);
      }
    } catch (emailError) {
      console.warn('izidoc-sign: Error sending contract email:', emailError);
      // Continue without failing the contract signing process
    }

    console.log('izidoc-sign: Contract processing completed successfully');

    // Return success immediately - don't wait for emails
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contractId: contractId,
          documentId: contractId,
          signedAt: data.created_at
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
