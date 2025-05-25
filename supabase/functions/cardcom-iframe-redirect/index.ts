
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
  operationType: number
  origin: string
  amount: number
  webHookUrl: string
  registrationData?: any
  userDetails?: {
    fullName: string
    email: string
    phone: string
    idNumber: string
  }
  returnValue: string
  hasTrial?: boolean
  trialDays?: number
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
      operationType, 
      origin, 
      amount, 
      webHookUrl, 
      registrationData, 
      userDetails,
      returnValue,
      hasTrial,
      trialDays 
    }: PaymentRequest = await req.json()

    // Get CardCom credentials
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL_NUMBER')
    const apiName = Deno.env.get('CARDCOM_API_NAME')
    const apiPassword = Deno.env.get('CARDCOM_API_PASSWORD')

    if (!terminalNumber || !apiName || !apiPassword) {
      throw new Error('CardCom credentials not configured')
    }

    console.log(`Creating CardCom payment session with terminal: ${terminalNumber}, operation: ${getOperationName(operationType)}, amount: ${amount}`)

    // Prepare CardCom API payload
    const cardcomPayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      APIPassword: apiPassword,
      CoinId: 1, // ILS
      SumToBill: amount, // Use correct amount from plan
      Operation: operationType, // Use correct operation type
      ReturnValue: returnValue,
      SuccessRedirectUrl: `${origin}/payment/success`,
      ErrorRedirectUrl: `${origin}/payment/failed`, 
      CancelRedirectUrl: `${origin}/subscription`,
      WebHookUrl: webHookUrl,
      MaxNumOfPayments: 1,
      UseCardholderName: true,
      // Pre-fill user details
      CardOwnerName: userDetails?.fullName || fullName || '',
      CardOwnerEmail: userDetails?.email || email || '',
      CardOwnerPhone: userDetails?.phone || '',
      CardOwnerID: userDetails?.idNumber || '',
      // Set language to Hebrew
      Language: "he",
      UTF8: true
    }

    console.log('Sending payload with user details:', {
      name: cardcomPayload.CardOwnerName,
      email: cardcomPayload.CardOwnerEmail,
      phone: cardcomPayload.CardOwnerPhone,
      idNumber: cardcomPayload.CardOwnerID,
      operation: getOperationName(operationType),
      amount: amount,
      webhookUrl: webHookUrl
    })

    // Call CardCom API
    const response = await fetch('https://secure.cardcom.solutions/api/v1/LowProfile/Create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardcomPayload)
    })

    const cardcomResponse = await response.json()

    if (cardcomResponse.ResponseCode !== 0) {
      throw new Error(`CardCom error: ${cardcomResponse.Description}`)
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
          amount: amount,
          currency: 'ILS',
          status: 'initiated',
          low_profile_id: lowProfileId,
          operation_type: getOperationName(operationType),
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          payment_details: {
            operationType,
            planId,
            hasTrial,
            trialDays,
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
        // Don't fail the payment creation, just log the error
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Continue with payment URL generation
    }

    // Return the payment URL
    return new Response(
      JSON.stringify({
        success: true,
        url: cardcomResponse.URL,
        lowProfileId: lowProfileId,
        sessionId: crypto.randomUUID()
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

function getOperationName(operationType: number): string {
  switch (operationType) {
    case 1: return 'ChargeOnly'
    case 2: return 'ChargeAndCreateToken'
    case 3: return 'CreateTokenOnly'
    default: return 'Unknown'
  }
}
