
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

    // Parse the form data from Cardcom webhook
    const formData = await req.formData()
    const webhookData: any = {}
    
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value
    }

    console.log('Received Cardcom webhook:', webhookData)

    const {
      ResponseCode,
      Token,
      TokenExDate,
      CardValidityYear,
      CardValidityMonth,
      TokenApprovalNumber,
      CardOwnerID,
      ReturnValue,
      TranzactionId,
      LastDigits,
      AbroadCard,
      VoucherNumber,
      SumToBill
    } = webhookData

    // Save the webhook data
    const { error: webhookError } = await supabase
      .from('payment_webhooks')
      .insert({
        id: crypto.randomUUID(),
        payload: webhookData,
        processed: false,
        created_at: new Date().toISOString()
      })

    if (webhookError) {
      console.error('Error saving webhook:', webhookError)
    }

    // Check if payment was successful
    const isSuccess = ResponseCode === '0'
    console.log('Payment success status:', isSuccess, 'ResponseCode:', ResponseCode)

    if (isSuccess && Token && ReturnValue) {
      // Process successful payment
      await processSuccessfulPayment({
        supabase,
        token: Token,
        tokenExDate: TokenExDate,
        cardValidityYear: CardValidityYear,
        cardValidityMonth: CardValidityMonth,
        tokenApprovalNumber: TokenApprovalNumber,
        cardOwnerID: CardOwnerID,
        returnValue: ReturnValue,
        transactionId: TranzactionId,
        lastDigits: LastDigits,
        sumToBill: SumToBill,
        webhookData
      })

      // Mark webhook as processed
      await supabase
        .from('payment_webhooks')
        .update({ processed: true })
        .eq('payload->>ReturnValue', ReturnValue)

      console.log('Payment processed successfully for:', ReturnValue)
    } else {
      console.error('Payment failed:', {
        ResponseCode,
        ReturnValue,
        hasToken: !!Token
      })
    }

    return new Response('OK', {
      headers: corsHeaders,
      status: 200
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Error', {
      headers: corsHeaders,
      status: 500
    })
  }
})

async function processSuccessfulPayment({
  supabase,
  token,
  tokenExDate,
  cardValidityYear,
  cardValidityMonth,
  tokenApprovalNumber,
  cardOwnerID,
  returnValue,
  transactionId,
  lastDigits,
  sumToBill,
  webhookData
}: any) {
  try {
    // Get payment session details
    const { data: sessionData, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', returnValue)
      .single()

    if (sessionError) {
      console.error('Error fetching payment session:', sessionError)
      return
    }

    const { user_id, plan_id, payment_details } = sessionData

    // Create token data object
    const tokenData = {
      token: token,
      lastFourDigits: lastDigits || '',
      expiryMonth: cardValidityMonth || '',
      expiryYear: cardValidityYear || '',
      cardholderName: payment_details?.userDetails?.fullName || '',
      cardType: 'unknown',
      approvalNumber: tokenApprovalNumber
    }

    if (user_id) {
      // Handle existing user payment
      await handleExistingUserPayment(supabase, user_id, plan_id, tokenData, payment_details)
    } else {
      // Handle guest registration
      await handleGuestRegistration(supabase, returnValue, tokenData, webhookData)
    }

    // Update payment session
    await supabase
      .from('payment_sessions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('low_profile_id', returnValue)

  } catch (error) {
    console.error('Error processing successful payment:', error)
  }
}

async function handleExistingUserPayment(supabase: any, userId: string, planId: string, tokenData: any, paymentDetails: any) {
  const now = new Date()
  let trialEndsAt = null
  let periodEndsAt = null
  
  if (planId === 'monthly') {
    trialEndsAt = new Date(now)
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1)
  } else if (planId === 'annual') {
    periodEndsAt = new Date(now)
    periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1)
  }

  // Update user subscription
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: planId,
      status: planId === 'monthly' ? 'trial' : 'active',
      trial_ends_at: trialEndsAt?.toISOString() || null,
      current_period_ends_at: periodEndsAt?.toISOString() || null,
      payment_method: tokenData,
      contract_signed: true,
      contract_signed_at: now.toISOString()
    })

  // Store payment token for future recurring charges
  if (tokenData.token) {
    await supabase
      .from('payment_tokens')
      .insert({
        user_id: userId,
        token: tokenData.token.toString(),
        token_expiry: `${tokenData.expiryYear}-${tokenData.expiryMonth}-01`,
        card_last_four: tokenData.lastFourDigits,
        is_active: true
      })
  }

  console.log('Updated subscription for existing user:', userId)
}

async function handleGuestRegistration(supabase: any, returnValue: string, tokenData: any, webhookData: any) {
  // Get temporary registration data
  const { data: tempData, error: tempError } = await supabase
    .from('temp_registration_data')
    .select('*')
    .eq('id', returnValue)
    .single()

  if (tempError || !tempData) {
    console.error('Could not find temp registration data:', tempError)
    return
  }

  // Register the user
  const { data, error } = await supabase.functions.invoke('register-user', {
    body: {
      registrationData: tempData.registration_data,
      tokenData: tokenData,
      contractDetails: tempData.registration_data?.contractDetails || null
    }
  })

  if (error) {
    console.error('Error registering guest user:', error)
  } else {
    console.log('Successfully registered guest user:', data?.userId)
    
    // Clean up temp data
    await supabase
      .from('temp_registration_data')
      .delete()
      .eq('id', returnValue)
  }
}
