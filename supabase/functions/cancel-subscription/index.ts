import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the user information
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Parse the request body
    const { subscriptionId, userId, reason, feedback } = await req.json();
    
    if (!subscriptionId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Verify that the requesting user owns the subscription
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'You can only cancel your own subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }
    
    // Get the subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();
      
    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }
    
    // If the subscription is already cancelled, return success
    if (subscription.status === 'cancelled') {
      return new Response(
        JSON.stringify({ success: true, message: 'Subscription already cancelled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Update subscription status to cancelled
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now
      })
      .eq('id', subscriptionId)
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    // Store cancellation reason and feedback
    if (reason) {
      const { error: reasonError } = await supabaseClient
        .from('subscription_cancellations')
        .insert({
          subscription_id: subscriptionId,
          user_id: userId,
          reason,
          feedback: feedback || null,
          cancelled_at: now
        });
        
      if (reasonError) {
        console.error('Error saving cancellation reason:', reasonError);
        // Don't fail the whole operation if this fails
      }
    }
    
    // If there's a payment token, deactivate it and cancel recurring in Cardcom
    if (subscription.payment_token_id) {
      // Get the token value from payment_tokens table
      const { data: tokenRow, error: tokenFetchError } = await supabaseClient
        .from('payment_tokens')
        .select('token')
        .eq('id', subscription.payment_token_id)
        .single();
      if (tokenFetchError) {
        console.error('Error fetching payment token:', tokenFetchError);
      }
      if (tokenRow?.token) {
        // קריאה ל-Cardcom לביטול recurring
        try {
          const cardcomTerminal = Deno.env.get('NEXT_PUBLIC_CARDCOM_TERMINAL') || Deno.env.get('NEXT_PUBLIC_CARDCOM_TEST_TERMINAL');
          const cardcomUser = Deno.env.get('NEXT_PUBLIC_CARDCOM_USERNAME') || Deno.env.get('NEXT_PUBLIC_CARDCOM_TEST_USERNAME');
          const cardcomPass = Deno.env.get('NEXT_PUBLIC_CARDCOM_PASSWORD') || Deno.env.get('NEXT_PUBLIC_CARDCOM_TEST_PASSWORD');
          const cardcomBaseUrl = 'https://secure.cardcom.solutions/api/v11';
          const cancelUrl = `${cardcomBaseUrl}/Token/Cancel`;
          const cancelPayload = {
            TerminalNumber: cardcomTerminal,
            ApiName: cardcomUser,
            ApiPassword: cardcomPass,
            Token: tokenRow.token
          };
          const cardcomRes = await fetch(cancelUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancelPayload)
          });
          const cardcomData = await cardcomRes.json();
          if (cardcomData.ResponseCode !== 0) {
            console.error('Cardcom recurring cancel failed:', cardcomData);
          } else {
            console.log('Cardcom recurring cancelled successfully:', cardcomData);
          }
        } catch (cardcomError) {
          console.error('Error cancelling recurring in Cardcom:', cardcomError);
        }
      }
      // Update token status in DB
      const { error: tokenError } = await supabaseClient
        .from('payment_tokens')
        .update({ is_active: false })
        .eq('id', subscription.payment_token_id);
      if (tokenError) {
        console.error('Error deactivating payment token:', tokenError);
        // Continue even if this fails
      }
    }
    
    // Get user email for sending notification
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();
    
    // Send cancellation email
    try {
      const fullName = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 
        'שלום';
        
      const emailSubject = 'אישור ביטול המנוי';
      const emailContent = `
        <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
          <h2>ביטול מנוי - אישור</h2>
          <p>שלום ${fullName},</p>
          <p>קיבלנו את בקשתך לביטול המנוי.</p>
          <p>המנוי יישאר פעיל עד לסיום תקופת התשלום הנוכחית.</p>
          <p>אם ברצונך להפעיל מחדש את המנוי בתוך 30 ימים, תוכל לעשות זאת דרך אזור החשבון האישי.</p>
          <p>אנו מקווים לראות אותך שוב בקרוב!</p>
          <p>בברכה,<br>צוות התמיכה</p>
        </div>
      `;
      
      // Send the email
      await supabaseClient.functions.invoke('smtp-sender', {
        body: {
          to: user.email,
          subject: emailSubject,
          html: emailContent
        }
      });
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // Continue even if email sending fails
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during subscription cancellation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
