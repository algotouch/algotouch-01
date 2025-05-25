
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ContractSignRequest } from "./types.ts";
import { validateRequest } from "./validation.ts";
import { uploadContractToStorage } from "./storage-service.ts";
import { saveContractSignature, logEmailFailure } from "./database-service.ts";
import { sendContractEmail } from "./email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('izidoc-sign: Request received, method:', req.method);
    console.log('izidoc-sign: Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasSmtpHost: !!Deno.env.get('SMTP_HOST'),
      hasSmtpUser: !!Deno.env.get('SMTP_USER')
    });
    
    const requestBody = await req.json();
    console.log('izidoc-sign: Request body parsed, keys:', Object.keys(requestBody));
    
    const contractData: ContractSignRequest = requestBody;

    console.log('izidoc-sign: Processing contract signing request:', {
      userId: contractData.userId,
      planId: contractData.planId,
      email: contractData.email,
      fullName: contractData.fullName,
      hasSignature: !!contractData.signature,
      hasContractHtml: !!contractData.contractHtml,
      signatureLength: contractData.signature?.length || 0,
      contractHtmlLength: contractData.contractHtml?.length || 0
    });

    // Validate required inputs
    const validation = validateRequest(contractData);
    if (!validation.isValid) {
      console.error('izidoc-sign: Validation failed:', validation.missingFields);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          details: { missingFields: validation.missingFields }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Generate a unique contract ID
    const contractId = crypto.randomUUID();
    console.log('izidoc-sign: Generated contract ID:', contractId);

    // Upload contract to storage
    console.log('izidoc-sign: Starting contract upload to storage...');
    const pdfUrl = await uploadContractToStorage(contractId, contractData.contractHtml);
    console.log('izidoc-sign: Storage upload completed, has URL:', !!pdfUrl);

    // Store contract signature in database
    console.log('izidoc-sign: Saving contract to database...');
    const { data, error } = await saveContractSignature(contractId, contractData, pdfUrl);

    if (error) {
      console.error('izidoc-sign: Database error:', error);
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

    // Send contract email
    console.log('izidoc-sign: Initiating contract email sending...');
    const emailResult = await sendContractEmail(
      contractData.email,
      contractData.fullName,
      contractData.planId,
      contractId,
      contractData.contractHtml,
      data.created_at
    );

    console.log('izidoc-sign: Email sending completed:', {
      success: emailResult.success,
      hasError: !!emailResult.error
    });

    if (!emailResult.success) {
      console.error('izidoc-sign: Failed to send contract email:', emailResult.error);
      
      // Log the email failure for later retry
      await logEmailFailure(
        contractId,
        contractData.email,
        contractData.fullName,
        contractData.planId,
        emailResult.error
      );
    }

    console.log('izidoc-sign: Contract processing completed successfully');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          contractId: contractId,
          documentId: contractId,
          signedAt: data.created_at,
          emailSent: emailResult.success,
          emailError: emailResult.success ? undefined : emailResult.error
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("izidoc-sign: Critical error in function:", error);
    console.error("izidoc-sign: Error stack:", error.stack);
    
    // Return detailed error information
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        details: {
          stack: error.stack,
          name: error.name,
          type: typeof error
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
