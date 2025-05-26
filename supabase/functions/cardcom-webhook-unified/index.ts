
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

    // Parse webhook parameters from URL or body
    const url = new URL(req.url)
    const params = Object.fromEntries(url.searchParams.entries())
    
    console.log('CardCom webhook received:', params)

    const {
      LowProfileCode,
      Operation,
      OperationResponse,
      DealResponse,
      TokenResponse,
      Token,
      TokenExDate,
      InternalDealNumber,
      ReturnValue,
      CardOwnerName,
      CardOwnerEmail,
      CardNumber // Masked card number
    } = params

    // Validate essential parameters
    if (!LowProfileCode || !ReturnValue) {
      console.error('Missing essential webhook parameters')
      return new Response('Missing parameters', { status: 400 })
    }

    // Check if already processed
    const { data: existingSession } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_id', LowProfileCode)
      .single()

    if (!existingSession) {
      console.error('Payment session not found for LowProfileCode:', LowProfileCode)
      return new Response('Session not found', { status: 404 })
    }

    if (existingSession.status !== 'initiated') {
      console.log('Payment already processed:', LowProfileCode)
      return new Response('OK', { status: 200 })
    }

    const isSuccess = OperationResponse === '0'
    const isDealSuccess = !DealResponse || DealResponse === '0'
    const isTokenSuccess = !TokenResponse || TokenResponse === '0'

    console.log('Payment status:', {
      isSuccess,
      isDealSuccess,
      isTokenSuccess,
      operation: Operation
    })

    if (!isSuccess) {
      // Mark as failed
      await supabase
        .from('payment_sessions')
        .update({ 
          status: 'failed',
          transaction_data: params
        })
        .eq('low_profile_id', LowProfileCode)

      console.log('Payment failed:', OperationResponse)
      return new Response('OK', { status: 200 })
    }

    // Payment succeeded - process based on user type
    let userId = existingSession.user_id
    
    // Handle guest users - create account first
    if (!userId && existingSession.anonymous_data) {
      try {
        // Get registration data
        const { data: tempReg } = await supabase
          .from('temp_registration_data')
          .select('*')
          .eq('id', ReturnValue)
          .single()

        if (tempReg && tempReg.registration_data) {
          const regData = tempReg.registration_data
          
          // Create user account
          const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email: regData.email,
            password: regData.password,
            email_confirm: true,
            user_metadata: {
              first_name: regData.userData?.firstName,
              last_name: regData.userData?.lastName,
              registration_complete: true
            }
          })

          if (userError) {
            console.error('Error creating user:', userError)
            throw userError
          }

          userId = userData.user.id
          console.log('Created new user:', userId)

          // Update profiles table
          await supabase
            .from('profiles')
            .upsert({
              id: userId,
              first_name: regData.userData?.firstName,
              last_name: regData.userData?.lastName,
              phone: regData.userData?.phone
            })

          // Mark temp registration as used
          await supabase
            .from('temp_registration_data')
            .update({ used: true })
            .eq('id', ReturnValue)
        }
      } catch (error) {
        console.error('Error creating user account:', error)
        // Continue with payment processing even if user creation fails
      }
    }

    // Create subscription based on plan type
    const planDetails = existingSession.payment_details
    const planType = existingSession.plan_id
    
    let subscriptionData: any = {
      id: crypto.randomUUID(),
      user_id: userId,
      plan_type: planType,
      plan_id: planType,
      status: planDetails.hasTrial ? 'trial' : 'active',
      created_at: new Date().toISOString(),
      contract_signed: true,
      contract_signed_at: new Date().toISOString()
    }

    // Handle trial periods
    if (planDetails.hasTrial) {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + (planDetails.trialDays || 30))
      subscriptionData.trial_ends_at = trialEnd.toISOString()
      subscriptionData.next_charge_at = trialEnd.toISOString()
    } else if (planType === 'annual') {
      const nextCharge = new Date()
      nextCharge.setFullYear(nextCharge.getFullYear() + 1)
      subscriptionData.next_charge_at = nextCharge.toISOString()
    }
    // VIP has no next charge date

    // Save token information if received
    if (Token && isTokenSuccess) {
      subscriptionData.token = Token
      if (TokenExDate) {
        // Convert YYYYMMDD to YYYY-MM format
        const year = TokenExDate.substring(0, 4)
        const month = TokenExDate.substring(4, 6)
        subscriptionData.token_expires_ym = `${month}/${year.substring(2)}`
      }
      
      // Save payment method info
      subscriptionData.payment_method = {
        token: Token,
        lastFourDigits: CardNumber ? CardNumber.slice(-4) : '****',
        cardholderName: CardOwnerName || '',
        expiryMonth: TokenExDate ? TokenExDate.substring(4, 6) : '',
        expiryYear: TokenExDate ? TokenExDate.substring(0, 4) : ''
      }

      // Create recurring payment record if token created
      await supabase
        .from('recurring_payments')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          token: Token,
          token_expiry: TokenExDate ? 
            `${TokenExDate.substring(0, 4)}-${TokenExDate.substring(4, 6)}-01` : 
            new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().split('T')[0],
          last_4_digits: CardNumber ? CardNumber.slice(-4) : '****',
          status: 'active',
          is_valid: true
        })
    }

    // Create subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)

    if (subError) {
      console.error('Error creating subscription:', subError)
      throw subError
    }

    // Log the payment
    await supabase
      .from('user_payment_logs')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        subscription_id: subscriptionData.id,
        amount: existingSession.amount,
        currency: existingSession.currency,
        status: 'payment_success',
        transaction_id: InternalDealNumber || LowProfileCode,
        token: Token || LowProfileCode,
        payment_data: {
          lowProfileCode: LowProfileCode,
          operationType: existingSession.operation_type,
          cardcomDealId: InternalDealNumber,
          planType: planType
        }
      })

    // Mark session as completed
    await supabase
      .from('payment_sessions')
      .update({ 
        status: 'completed',
        transaction_data: params,
        transaction_id: InternalDealNumber
      })
      .eq('low_profile_id', LowProfileCode)

    console.log('Payment processed successfully for user:', userId)
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response('Error', { status: 500, headers: corsHeaders })
  }
})
