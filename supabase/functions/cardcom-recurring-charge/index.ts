
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, amount, description = 'Monthly subscription charge' } = await req.json()

    // Get user's active payment token
    const { data: tokenData, error: tokenError } = await supabase
      .from('payment_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      throw new Error('No active payment token found for user')
    }

    // Check token expiry
    const tokenExpiry = new Date(tokenData.token_expiry)
    const now = new Date()
    if (tokenExpiry < now) {
      throw new Error('Payment token has expired')
    }

    // Get CardCom credentials
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL_NUMBER')
    const userName = Deno.env.get('CARDCOM_USERNAME')

    if (!terminalNumber || !userName) {
      throw new Error('CardCom credentials not configured')
    }

    // Prepare charge request with CORRECT LOWERCASE parameters
    const formData = new URLSearchParams({
      'terminalnumber': terminalNumber, // lowercase
      'username': userName, // lowercase
      'codepage': '65001', // Required for UTF-8
      'apilevel': '10', // lowercase
      'TokenToCharge.Token': tokenData.token,
      'TokenToCharge.CardValidityMonth': tokenData.card_last_four ? tokenExpiry.getMonth().toString().padStart(2, '0') : '12',
      'TokenToCharge.CardValidityYear': tokenExpiry.getFullYear().toString(),
      'TokenToCharge.SumToBill': (amount / 100).toFixed(2), // Convert from agorot to shekels
      'TokenToCharge.JParameter': '5'
    })

    console.log('Charging token for user:', userId, 'Amount:', amount)

    // Call CardCom ChargeToken API
    const response = await fetch('https://secure.cardcom.solutions/interface/ChargeToken.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    if (!response.ok) {
      throw new Error(`CardCom ChargeToken API returned ${response.status}: ${response.statusText}`)
    }

    const responseText = await response.text()
    console.log('CardCom ChargeToken response:', responseText)

    // Check if CardCom returned HTML error page
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
      console.error('CardCom returned HTML error page for token charge')
      throw new Error('Bad CardCom parameters for token charge - received HTML error page')
    }

    // Parse response (usually XML or form data)
    const isSuccess = responseText.includes('ResponseCode>0<') || responseText.includes('ResponseCode=0')
    
    if (isSuccess) {
      // Record successful payment
      await supabase
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: amount,
          currency: 'ILS',
          status: 'completed',
          payment_method: {
            token: tokenData.token,
            lastFourDigits: tokenData.card_last_four,
            type: 'recurring_token'
          },
          token: `recurring_${Date.now()}`
        })

      console.log('Recurring charge successful for user:', userId)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Charge completed successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      throw new Error('Charge failed: ' + responseText)
    }

  } catch (error) {
    console.error('Error processing recurring charge:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
