
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContractEmailRequest {
  customerEmail: string;
  customerName: string;
  contractId: string;
  contractHtml: string;
  planId: string;
  signedAt: string;
  supportEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerEmail,
      customerName,
      contractId,
      contractHtml,
      planId,
      signedAt,
      supportEmail
    }: ContractEmailRequest = await req.json();

    console.log('Processing contract email request:', {
      customerEmail,
      customerName,
      contractId,
      planId,
      supportEmail
    });

    // Generate customer email content
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
            <p>שלום ${customerName},</p>
            
            <p>תודה שבחרת ב-AlgoTouch! אנו שמחים לאשר שחתמת בהצלחה על החוזה עבור תכנית ${planId}.</p>
            
            <div class="highlight">
              <strong>פרטי החוזה:</strong><br>
              מזהה חוזה: ${contractId}<br>
              תאריך חתימה: ${new Date(signedAt).toLocaleDateString('he-IL')}<br>
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

    // Generate support email content
    const supportEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>New Contract Signed - ${customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .details { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .contract-content { border: 1px solid #ddd; padding: 20px; margin: 20px 0; max-height: 400px; overflow-y: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Contract Signed</h1>
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="details">
            <h2>Contract Details</h2>
            <p><strong>Contract ID:</strong> ${contractId}</p>
            <p><strong>Customer Name:</strong> ${customerName}</p>
            <p><strong>Customer Email:</strong> ${customerEmail}</p>
            <p><strong>Plan:</strong> ${planId}</p>
            <p><strong>Signed At:</strong> ${new Date(signedAt).toISOString()}</p>
          </div>
          
          <div class="contract-content">
            <h3>Contract HTML Content:</h3>
            ${contractHtml}
          </div>
        </div>
      </body>
      </html>
    `;

    // Convert contract HTML to base64 for attachment
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));

    // Send email to customer
    try {
      const customerEmailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/smtp-sender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          to: customerEmail,
          subject: 'אישור חתימת חוזה - AlgoTouch',
          html: customerEmailHtml,
          attachmentData: [{
            filename: `contract-${customerName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.html`,
            content: contractBase64,
            mimeType: "text/html"
          }]
        }),
      });

      const customerEmailResult = await customerEmailResponse.json();
      console.log('Customer email result:', customerEmailResult);
    } catch (error) {
      console.error('Error sending customer email:', error);
    }

    // Send email to support
    try {
      const supportEmailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/smtp-sender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          to: supportEmail,
          subject: `חוזה חדש נחתם - ${customerName}`,
          html: supportEmailHtml,
          attachmentData: [{
            filename: `contract-${customerName.replace(/\s+/g, '-')}-${contractId}.html`,
            content: contractBase64,
            mimeType: "text/html"
          }]
        }),
      });

      const supportEmailResult = await supportEmailResponse.json();
      console.log('Support email result:', supportEmailResult);
    } catch (error) {
      console.error('Error sending support email:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Contract emails sent successfully",
        contractId 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in send-contract-emails function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
