
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  planId: string
  userId?: string
  fullName: string
  email: string
  phone?: string
  idNumber?: string
  origin: string
  registrationData?: any
  userDetails?: {
    fullName: string
    email: string
    phone: string
    idNumber: string
  }
}

interface PlanDetails {
  operationType: number
  amount: number
  hasTrial?: boolean
  trialDays?: number
  recurringAmount?: number
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

    const { 
      planId, 
      userId, 
      fullName, 
      email, 
      phone,
      idNumber,
      origin, 
      registrationData, 
      userDetails 
    }: PaymentRequest = await req.json()

    // Get CardCom credentials
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL_NUMBER')
    const userName = Deno.env.get('CARDCOM_USERNAME')

    if (!terminalNumber || !userName) {
      throw new Error('CardCom credentials not configured')
    }

    // Get plan details with updated pricing strategy
    const planDetails = getPlanDetails(planId)
    
    // Generate unique return value for tracking
    const tempRegistrationId = userId || `temp_reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    
    console.log(`Creating CardCom payment for plan: ${planId}`, {
      operationType: planDetails.operationType,
      amount: planDetails.amount,
      hasTrial: planDetails.hasTrial,
      email: email
    })

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/cardcom-webhook-unified`
    const successUrl = `${origin}/payment/success`
    const errorUrl = `${origin}/payment/failed`

    // Prepare CardCom API payload according to official documentation
    const formData = new URLSearchParams({
      'Operation': planDetails.operationType.toString(),
      'TerminalNumber': terminalNumber,
      'UserName': userName,
      'SumToBill': (planDetails.amount / 100).toFixed(2), // Convert from agorot to shekels
      'CoinID': '1', // ILS
      'Language': 'he',
      'ProductName': `AlgoTouch ${getPlanName(planId)}`,
      'APILevel': '10',
      'Codepage': '65001',
      'SuccessRedirectUrl': successUrl,
      'ErrorRedirectUrl': errorUrl,
      'IndicatorUrl': webhookUrl,
      'ReturnValue': tempRegistrationId,
      'AutoRedirect': 'true'
    })

    console.log('Sending CardCom request to LowProfile.aspx:', {
      operation: planDetails.operationType,
      amount: (planDetails.amount / 100).toFixed(2),
      email: email,
      webhookUrl: webhookUrl,
      terminalNumber: terminalNumber
    })

    // Call CardCom LowProfile API according to documentation
    const response = await fetch('https://secure.cardcom.solutions/Interface/LowProfile.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    })

    if (!response.ok) {
      throw new Error(`CardCom API returned ${response.status}: ${response.statusText}`)
    }

    const responseText = await response.text()
    console.log('CardCom LowProfile response:', responseText)

    // Parse the HTML response to extract the payment URL
    const urlMatch = responseText.match(/url=([^"'>\s]+)/i)
    if (!urlMatch) {
      console.error('Could not extract URL from CardCom response:', responseText)
      throw new Error('Invalid response from CardCom - no URL found')
    }

    const paymentUrl = urlMatch[1]
    console.log(`Created CardCom payment session with URL: ${paymentUrl}`)

    // Save payment session to database
    try {
      const { error: sessionError } = await supabase
        .from('payment_sessions')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId || null,
          plan_id: planId,
          amount: planDetails.amount,
          currency: 'ILS',
          status: 'initiated',
          low_profile_id: tempRegistrationId,
          operation_type: getOperationName(planDetails.operationType),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          payment_details: {
            operationType: planDetails.operationType,
            planId,
            hasTrial: planDetails.hasTrial,
            trialDays: planDetails.trialDays || 0,
            recurringAmount: planDetails.recurringAmount || 0,
            userDetails: userDetails || {},
            registrationData: registrationData || {}
          },
          anonymous_data: userId ? null : {
            fullName,
            email,
            registrationData
          }
        })

      if (sessionError) {
        console.error('Error saving payment session:', sessionError)
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
    }

    // Store registration data for guest users
    if (!userId && registrationData) {
      try {
        await supabase
          .from('temp_registration_data')
          .insert({
            id: tempRegistrationId,
            registration_data: registrationData,
            payment_session_id: tempRegistrationId,
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            step_completed: 'payment_initiated'
          })
        
        console.log('Stored temporary registration data:', tempRegistrationId)
      } catch (tempError) {
        console.error('Error storing temp registration:', tempError)
      }
    }

    // Return the payment URL
    return new Response(
      JSON.stringify({
        success: true,
        url: paymentUrl,
        sessionId: tempRegistrationId,
        operationType: planDetails.operationType,
        amount: planDetails.amount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error creating CardCom payment:', error)
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

function getPlanDetails(planId: string): PlanDetails {
  switch (planId) {
    case 'monthly':
      return {
        operationType: 2, // ChargeAndCreateToken - charge 1₪ first month + token
        amount: 100, // 1₪ for card validation (in agorot)
        hasTrial: false,
        recurringAmount: 37100 // 371₪ for subsequent months
      };
    case 'annual':
      return {
        operationType: 2, // ChargeAndCreateToken - immediate charge + token
        amount: 337100, // 3,371₪ in agorot
        hasTrial: false
      };
    case 'vip':
      return {
        operationType: 1, // ChargeOnly - one-time payment
        amount: 1312100, // 13,121₪ in agorot
        hasTrial: false
      };
    default:
      return {
        operationType: 2,
        amount: 100,
        hasTrial: false
      };
  }
}

function getPlanName(planId: string): string {
  switch (planId) {
    case 'monthly': return 'Monthly Subscription'
    case 'annual': return 'Annual Subscription'
    case 'vip': return 'VIP Lifetime'
    default: return 'Subscription'
  }
}

function getOperationName(operationType: number): string {
  switch (operationType) {
    case 1: return 'ChargeOnly'
    case 2: return 'ChargeAndCreateToken'
    case 3: return 'CreateTokenOnly'
    default: return 'Unknown'
  }
}
