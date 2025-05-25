
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
    const apiName = Deno.env.get('CARDCOM_API_NAME')
    const apiPassword = Deno.env.get('CARDCOM_API_PASSWORD')

    if (!terminalNumber || !apiName || !apiPassword) {
      throw new Error('CardCom credentials not configured')
    }

    // Get plan details with correct operation types and amounts
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

    // Prepare CardCom API payload with correct operation type
    const cardcomPayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      APIPassword: apiPassword,
      CoinId: 1, // ILS
      SumToBill: planDetails.amount, // Correct amount based on plan
      Operation: planDetails.operationType, // Correct operation type
      ReturnValue: tempRegistrationId,
      SuccessRedirectUrl: `${origin}/payment/success`,
      ErrorRedirectUrl: `${origin}/payment/failed`, 
      CancelRedirectUrl: `${origin}/subscription`,
      WebHookUrl: webhookUrl,
      MaxNumOfPayments: 1,
      UseCardholderName: true,
      // Pre-fill user details
      CardOwnerName: userDetails?.fullName || fullName || '',
      CardOwnerEmail: userDetails?.email || email || '',
      CardOwnerPhone: userDetails?.phone || phone || '',
      CardOwnerID: userDetails?.idNumber || idNumber || '',
      // Set language to Hebrew
      Language: "he",
      UTF8: true
    }

    console.log('Sending CardCom payload:', {
      operation: getOperationName(planDetails.operationType),
      amount: planDetails.amount,
      email: cardcomPayload.CardOwnerEmail,
      webhookUrl: webhookUrl
    })

    // Call CardCom API
    const response = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/Create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardcomPayload)
    })

    if (!response.ok) {
      throw new Error(`CardCom API returned ${response.status}: ${response.statusText}`)
    }

    const cardcomResponse = await response.json()
    console.log('CardCom response:', cardcomResponse)

    if (cardcomResponse.ResponseCode !== 0) {
      throw new Error(`CardCom error (${cardcomResponse.ResponseCode}): ${cardcomResponse.Description || 'Unknown error'}`)
    }

    const lowProfileId = cardcomResponse.LowProfileId
    console.log(`Created CardCom payment session: ${lowProfileId}`)

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
          low_profile_id: lowProfileId,
          operation_type: getOperationName(planDetails.operationType),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
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
            payment_session_id: lowProfileId,
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
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
        url: cardcomResponse.URL,
        lowProfileId: lowProfileId,
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
        operationType: 3, // CreateTokenOnly - trial first
        amount: 0, // No charge during trial
        hasTrial: true,
        trialDays: 30,
        recurringAmount: 371
      };
    case 'annual':
      return {
        operationType: 2, // ChargeAndCreateToken - immediate charge + token
        amount: 3371,
        hasTrial: false
      };
    case 'vip':
      return {
        operationType: 1, // ChargeOnly - one-time payment
        amount: 13121,
        hasTrial: false
      };
    default:
      return {
        operationType: 3,
        amount: 0,
        hasTrial: false
      };
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
