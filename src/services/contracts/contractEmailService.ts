
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Interface for contract email data
 */
export interface ContractEmailData {
  customerEmail: string;
  customerName: string;
  contractId: string;
  contractHtml: string;
  planId: string;
  signedAt: string;
}

/**
 * Sends contract confirmation email to customer and support
 */
export async function sendContractEmails(contractData: ContractEmailData): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Sending contract emails for:', { 
      customerEmail: contractData.customerEmail,
      contractId: contractData.contractId,
      planId: contractData.planId
    });

    // Call the email edge function
    const { data, error } = await supabase.functions.invoke('send-contract-emails', {
      body: {
        customerEmail: contractData.customerEmail,
        customerName: contractData.customerName,
        contractId: contractData.contractId,
        contractHtml: contractData.contractHtml,
        planId: contractData.planId,
        signedAt: contractData.signedAt,
        supportEmail: 'support@algotouch.co.il'
      }
    });

    if (error) {
      console.error('Error sending contract emails:', error);
      return { success: false, error };
    }

    console.log('Contract emails sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Exception sending contract emails:', error);
    return { success: false, error };
  }
}

/**
 * Generates customer email template
 */
export function generateCustomerEmailTemplate(customerName: string, contractId: string, planId: string): string {
  return `
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
            תאריך חתימה: ${new Date().toLocaleDateString('he-IL')}<br>
            תכנית: ${planId}
          </div>
          
          <p>החוזה החתום נשמר במערכת שלנו וניתן לצפות בו בכל עת דרך האזור האישי שלך.</p>
          
          <p>אם יש לך שאלות או צריך עזרה, אנא פנה אלינו:</p>
          <ul>
            <li>מייל: support@algotouch.co.il</li>
            <li>טלפון: [מספר טלפון]</li>
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
}

/**
 * Generates support email template
 */
export function generateSupportEmailTemplate(
  customerName: string, 
  customerEmail: string, 
  contractId: string, 
  planId: string,
  contractHtml: string
): string {
  return `
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
          <p><strong>Signed At:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <div class="contract-content">
          <h3>Contract HTML Content:</h3>
          ${contractHtml}
        </div>
      </div>
    </body>
    </html>
  `;
}
