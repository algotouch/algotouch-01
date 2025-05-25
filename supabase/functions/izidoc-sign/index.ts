
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
    }: ContractSignRequest = await req.json();

    console.log('Processing contract signing request:', {
      userId,
      planId,
      email,
      hasSignature: !!signature,
      hasContractHtml: !!contractHtml,
      hasFullName: !!fullName
    });

    // Validate required inputs
    if (!userId || !planId || !email || !signature || !contractHtml || !fullName) {
      const missingFields = {
        hasUserId: !!userId,
        hasPlanId: !!planId,
        hasEmail: !!email,
        hasSignature: !!signature,
        hasContractHtml: !!contractHtml,
        hasFullName: !!fullName
      };
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          details: missingFields
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate userId is a proper UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid userId format:', userId);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid user ID format'
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
    console.log('Generated contract ID:', contractId);

    // Try to upload HTML to storage first (optional step)
    let pdfUrl = null;
    try {
      const fileName = `${userId}/${contractId}.html`;
      const encoder = new TextEncoder();
      const bytes = encoder.encode(contractHtml);
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('contracts')
        .upload(fileName, bytes, {
          contentType: 'text/html',
          upsert: true
        });
      
      if (uploadError) {
        console.warn('Storage upload failed, continuing without URL:', uploadError);
      } else {
        console.log('Contract uploaded to storage:', uploadData?.path);
        
        // Create a signed URL
        const { data: urlData } = await supabase
          .storage
          .from('contracts')
          .createSignedUrl(fileName, 60 * 60 * 24 * 30); // 30 days expiry
        
        pdfUrl = urlData?.signedUrl;
      }
    } catch (storageError) {
      console.warn('Storage operation failed, continuing without URL:', storageError);
    }

    // Store contract signature in database using service role
    const { data, error } = await supabase
      .from('contract_signatures')
      .insert({
        id: contractId,
        user_id: userId,
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
      console.error('Error saving contract signature:', error);
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

    console.log('Contract signature saved successfully:', data);

    // Send contract emails (optional - don't fail if this doesn't work)
    try {
      const { error: emailError } = await supabase.functions.invoke('send-contract-emails', {
        body: {
          customerEmail: email,
          customerName: fullName,
          contractId: contractId,
          contractHtml: contractHtml,
          planId: planId,
          signedAt: new Date().toISOString(),
          supportEmail: 'support@algotouch.co.il'
        }
      });
      
      if (emailError) {
        console.warn('Email sending failed:', emailError);
      } else {
        console.log('Contract emails sent successfully');
      }
    } catch (emailError) {
      console.warn('Email sending failed:', emailError);
    }

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
    console.error("Error in izidoc-sign function:", error);
    
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
