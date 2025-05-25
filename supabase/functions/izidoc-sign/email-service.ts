
import { EmailResult } from "./types.ts";

export async function sendContractEmail(
  email: string,
  fullName: string,
  planId: string,
  contractId: string,
  contractHtml: string,
  createdAt: string,
  maxRetries = 2
): Promise<EmailResult> {
  console.log('izidoc-sign: Starting email sending process for:', email);
  
  // Validate SMTP configuration
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  console.log('izidoc-sign: SMTP configuration check:', {
    hasHost: !!smtpHost,
    hasPort: !!smtpPort,
    hasUser: !!smtpUser,
    hasPass: !!smtpPass,
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceRoleKey: !!serviceRoleKey
  });

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.error('izidoc-sign: Missing SMTP configuration');
    return { success: false, error: 'Missing SMTP configuration' };
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('izidoc-sign: Missing Supabase configuration for email sending');
    return { success: false, error: 'Missing Supabase configuration' };
  }

  // Convert contract HTML to base64 for attachment
  try {
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
    console.log('izidoc-sign: Contract converted to base64, size:', contractBase64.length);

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
              תאריך חתימה: ${new Date(createdAt).toLocaleDateString('he-IL')}<br>
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

    // Retry mechanism
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`izidoc-sign: Email sending attempt ${attempt}/${maxRetries}`);
        
        const emailPayload = {
          to: email,
          subject: 'אישור חתימת חוזה - AlgoTouch',
          html: customerEmailHtml,
          attachmentData: [{
            filename: `contract-${fullName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0,10)}.html`,
            content: contractBase64,
            mimeType: "text/html"
          }]
        };

        console.log('izidoc-sign: Calling SMTP sender with payload:', {
          to: email,
          subject: emailPayload.subject,
          hasHtml: !!emailPayload.html,
          attachmentCount: emailPayload.attachmentData.length
        });

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/smtp-sender`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        console.log('izidoc-sign: SMTP response received:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          ok: emailResponse.ok
        });
        
        if (!emailResponse.ok) {
          const responseText = await emailResponse.text();
          console.error('izidoc-sign: SMTP function error response:', {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            response: responseText
          });
          
          if (attempt === maxRetries) {
            return { 
              success: false, 
              error: `SMTP function error: ${emailResponse.status} - ${responseText}` 
            };
          }
          continue;
        }

        const emailResult = await emailResponse.json();
        console.log('izidoc-sign: SMTP function result:', emailResult);
        
        if (emailResult.success) {
          console.log('izidoc-sign: Contract email sent successfully');
          return { success: true };
        } else {
          console.warn(`izidoc-sign: Email attempt ${attempt} failed:`, emailResult.error);
          
          if (attempt === maxRetries) {
            return { success: false, error: emailResult.error };
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      } catch (emailError) {
        console.error(`izidoc-sign: Email attempt ${attempt} threw error:`, emailError);
        
        if (attempt === maxRetries) {
          return { success: false, error: emailError.message || 'Unknown email error' };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
    
  } catch (conversionError) {
    console.error('izidoc-sign: Error converting contract for email:', conversionError);
    return { 
      success: false, 
      error: `Contract conversion error: ${conversionError.message}` 
    };
  }
}
