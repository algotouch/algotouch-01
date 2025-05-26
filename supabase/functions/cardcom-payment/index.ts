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

// CardCom API configuration
const API_CONFIG = {
  TERMINAL: Deno.env.get('CARDCOM_TERMINAL'),
  USERNAME: Deno.env.get('CARDCOM_USERNAME'),
  PASSWORD: Deno.env.get('CARDCOM_API_PASSWORD'),
  BASE_URL: 'https://secure.cardcom.solutions/api/v11',
};

// Log configuration for debugging (without exposing sensitive values)
console.log('CardCom API configuration initialized with terminal:', 
  API_CONFIG.TERMINAL ? '[terminal configured]' : '[terminal missing]');
console.log('CardCom API credentials status:',
  (API_CONFIG.USERNAME && API_CONFIG.PASSWORD) ? '[credentials configured]' : '[credentials missing]');

// CardCom operation types
enum OperationType {
  CHARGE_ONLY = 1,        // Charge card only
  CHARGE_AND_TOKEN = 2,   // Charge and create token
  TOKEN_ONLY = 3,         // Create token only (for future charges)
}

// Create a payment session with CardCom API v11
async function createPaymentSession(params: any) {
  const { 
    planId,
    amount,
    operationType = OperationType.TOKEN_ONLY,
    successUrl,
    errorUrl,
    webHookUrl,
    returnValue,
    cardOwnerName,
    cardOwnerEmail,
    cardOwnerPhone
  } = params;
  
  // Validate required configuration
  if (!API_CONFIG.TERMINAL || !API_CONFIG.USERNAME) {
    throw new Error('Missing CardCom configuration. Please check environment variables.');
  }
  
  try {
    // Prepare the request payload for LowProfile Create
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ReturnValue: returnValue || 'direct-payment',
      Amount: amount,
      SuccessRedirectUrl: successUrl,
      FailedRedirectUrl: errorUrl,
      WebHookUrl: webHookUrl,
      Operation: operationType.toString(),
      Language: "he",
      ISOCoinId: 1, // ILS
      
      // Product info
      ProductName: `מנוי ${planId === 'monthly' ? 'חודשי' : planId === 'annual' ? 'שנתי' : 'VIP'}`,
      
      // Payment options
      MaxNumOfPayments: planId === 'annual' ? '12' : '1',
      
      // UI settings for collecting customer info
      UIDefinition: {
        ShowCardOwnerName: true,
        ShowCardOwnerEmail: true,
        ShowCardOwnerPhone: true,
        CardOwnerName: cardOwnerName || "",
        CardOwnerEmail: cardOwnerEmail || "",
        CardOwnerPhone: cardOwnerPhone || "",
      }
    };

    console.log('Creating CardCom payment session:', { 
      planId, 
      amount, 
      operationType,
      webhookConfigured: !!webHookUrl
    });
    
    // Make the API request
    const response = await fetch(`${API_CONFIG.BASE_URL}/LowProfile/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CardCom API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.ResponseCode !== 0) {
      throw new Error(`CardCom error: ${result.Description || 'Unknown error'}`);
    }
    
    return {
      success: true,
      lowProfileId: result.LowProfileId,
      url: result.Url
    };
  } catch (error: any) {
    console.error('Error creating CardCom payment session:', error);
    throw error;
  }
}

// Verify payment status with CardCom
async function verifyPayment(lowProfileId: string) {
  try {
    // Validate required configuration
    if (!API_CONFIG.TERMINAL || !API_CONFIG.USERNAME || !API_CONFIG.PASSWORD) {
      throw new Error('Missing CardCom configuration. Please check environment variables.');
    }
    
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ApiPassword: API_CONFIG.PASSWORD,
      LowProfileId: lowProfileId
    };
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/LowProfile/GetLpResult`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`CardCom verification error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Payment is successful if ResponseCode is 0
    if (result.ResponseCode !== 0) {
      return {
        success: false,
        error: result.Description || 'Payment verification failed',
        details: result
      };
    }
    
    // Extract useful information from the response
    const paymentDetails = {
      transactionId: result.TranzactionId,
      amount: result.TranzactionInfo?.Amount,
      cardLastDigits: result.TranzactionInfo?.Last4CardDigitsString || result.UIValues?.CardLastFourDigits,
      approvalNumber: result.TranzactionInfo?.ApprovalNumber,
      cardType: result.TranzactionInfo?.CardInfo,
      cardExpiry: `${result.UIValues?.CardMonth || ''}/${result.UIValues?.CardYear || ''}`,
      cardOwnerName: result.UIValues?.CardOwnerName,
      cardOwnerEmail: result.UIValues?.CardOwnerEmail,
      cardOwnerPhone: result.UIValues?.CardOwnerPhone,
    };
    
    // Extract token information if available
    const tokenInfo = result.TokenInfo ? {
      token: result.TokenInfo.Token,
      expiryDate: result.TokenInfo.TokenExDate,
      approvalNumber: result.TokenInfo.TokenApprovalNumber
    } : null;
    
    // Get the registration ID if it was passed in ReturnValue
    const registrationId = result.ReturnValue;
    
    return {
      success: true,
      paymentDetails,
      tokenInfo,
      registrationId,
      rawResponse: result
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

// Process a direct charge using a token
async function processTokenCharge(params: any) {
  try {
    // Validate required configuration
    if (!API_CONFIG.TERMINAL || !API_CONFIG.USERNAME || !API_CONFIG.PASSWORD) {
      throw new Error('Missing CardCom configuration. Please check environment variables.');
    }
    
    const { 
      amount, 
      token, 
      cardOwnerName,
      cardOwnerEmail,
      cardOwnerPhone,
      identityNumber,
      numOfPayments = 1,
      externalTransactionId
    } = params;
    
    const payload = {
      TerminalNumber: parseInt(API_CONFIG.TERMINAL),
      ApiName: API_CONFIG.USERNAME,
      ApiPassword: API_CONFIG.PASSWORD,
      Amount: amount,
      Token: token,
      ExternalUniqTranId: externalTransactionId,
      NumOfPayments: numOfPayments,
      CardOwnerInformation: {
        FullName: cardOwnerName,
        CardOwnerEmail: cardOwnerEmail,
        Phone: cardOwnerPhone,
        IdentityNumber: identityNumber
      },
      ISOCoinId: 1, // ILS
    };
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/Transactions/Transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`CardCom token charge error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.ResponseCode !== 0) {
      return {
        success: false,
        error: result.Description || 'Token charge failed',
        details: result
      };
    }
    
    return {
      success: true,
      transactionId: result.TranzactionId,
      amount: result.Amount,
      approvalNumber: result.ApprovalNumber,
      cardLastDigits: result.Last4CardDigits,
      rawResponse: result
    };
  } catch (error) {
    console.error('Error processing token charge:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop() || '';

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user information if available
    let user = null;
    try {
      const { data } = await supabaseClient.auth.getUser();
      user = data.user;
      console.log('Authenticated user:', user?.email);
    } catch (authError) {
      console.error('Auth error:', authError);
      // Continue without user - might be registration flow
    }

    // Create payment session with CardCom
    if (path === 'create-payment') {
      const { 
        planId, 
        userId, 
        fullName, 
        email, 
        operationType = 1, 
        successRedirectUrl, 
        errorRedirectUrl,
        registrationData 
      } = await req.json();
      
      console.log('Creating payment session for:', { 
        planId, 
        userId: userId || (user?.id || 'anonymous'), 
        email: email || user?.email || 'anonymous',
        hasRegistrationData: !!registrationData
      });
      
      // Store registration data temporarily if provided
      let tempRegistrationId = null;
      if (registrationData) {
        try {
          // Generate a unique ID for this registration attempt
          tempRegistrationId = crypto.randomUUID();
          
          // Store in a temporary table with short expiration
          const { error: tempError } = await supabaseClient
            .from('temp_registration_data')
            .insert({
              id: tempRegistrationId,
              registration_data: registrationData,
              expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 min expiry
            });
            
          if (tempError) {
            console.error('Error storing temp registration:', tempError);
            throw new Error('Failed to store registration data: ' + tempError.message);
          } else {
            console.log('Stored temp registration data with ID:', tempRegistrationId);
          }
        } catch (storageError: any) {
          console.error('Error in temp registration storage:', storageError);
          throw new Error('Error storing registration data: ' + storageError.message);
        }
      }

      try {
        // Determine payment amount based on plan with proper USD to NIS conversion
        let amount = '0.00';
        if (planId === 'monthly') {
          amount = '375.00'; // 99 USD in NIS
        } else if (planId === 'annual') {
          amount = '3410.00'; // 899 USD in NIS
        } else if (planId === 'vip') {
          amount = '13270.00'; // 3499 USD in NIS
        }

        // Generate webhook URL using the current origin
        const origin = url.origin;
        const webhookUrl = `${origin}/payment-notification`;

        // Create CardCom payment session
        const sessionResult = await createPaymentSession({
          planId,
          amount,
          operationType,
          successUrl: `${successRedirectUrl}${tempRegistrationId ? `&regId=${tempRegistrationId}` : ''}`,
          errorUrl: errorRedirectUrl,
          webHookUrl: webhookUrl,
          returnValue: tempRegistrationId || 'direct-payment',
          cardOwnerName: fullName,
          cardOwnerEmail: email,
          cardOwnerPhone: registrationData?.userData?.phone
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            lowProfileId: sessionResult.lowProfileId,
            url: sessionResult.url,
            tempRegistrationId
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (cardcomError: any) {
        console.error('CardCom API error:', cardcomError);
        
        return new Response(
          JSON.stringify({ 
            success: false,
            error: cardcomError.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }
    
    // Retrieve stored registration data
    if (path === 'get-registration-data') {
      const { registrationId } = await req.json();
      
      if (!registrationId) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing registration ID' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      console.log('Retrieving registration data for ID:', registrationId);
      
      const { data, error } = await supabaseClient
        .from('temp_registration_data')
        .select('registration_data, used')
        .eq('id', registrationId)
        .single();
        
      if (error || !data) {
        console.error('Error retrieving temp registration:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Registration data not found or expired' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      
      // Mark as used so it can't be retrieved again
      await supabaseClient
        .from('temp_registration_data')
        .update({ used: true })
        .eq('id', registrationId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          registrationData: data.registration_data,
          alreadyUsed: data.used
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Verify payment status with CardCom
    if (path === 'verify-payment') {
      const { lowProfileId } = await req.json();
      
      if (!lowProfileId) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing lowProfileId' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      try {
        const verifyResult = await verifyPayment(lowProfileId);
        
        return new Response(
          JSON.stringify(verifyResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }
    
    // Process a direct charge using a token
    if (path === 'charge-token') {
      const { 
        token,
        amount,
        cardholderName,
        email,
        phone,
        identityNumber,
        numOfPayments,
        externalTransactionId
      } = await req.json();
      
      if (!token || !amount) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Missing required fields: token and amount' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      try {
        const chargeResult = await processTokenCharge({
          amount,
          token,
          cardOwnerName: cardholderName,
          cardOwnerEmail: email,
          cardOwnerPhone: phone,
          identityNumber,
          numOfPayments,
          externalTransactionId: externalTransactionId || `charge_${Date.now()}`
        });
        
        return new Response(
          JSON.stringify(chargeResult),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error: any) {
        console.error('Error processing token charge:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }
    
    // Payment notification webhook handler
    if (path === 'payment-notification') {
      try {
        // Parse the webhook payload
        const payload = await req.json();
        console.log('Payment notification received:', payload);
        
        // Store the webhook notification in the database for processing
        const { error } = await supabaseClient
          .from('payment_notifications')
          .insert({
            payload,
            processed: false,
            registration_id: payload.ReturnValue
          });
        
        if (error) {
          console.error('Error storing payment notification:', error);
        }
        
        // If this contains a registration ID, try to process it
        if (payload.ReturnValue && payload.OperationResponse === '0') {
          // Get the registration data
          const { data: regData } = await supabaseClient
            .from('temp_registration_data')
            .select('registration_data')
            .eq('id', payload.ReturnValue)
            .single();
            
          if (regData?.registration_data) {
            console.log('Found registration data for webhook notification');
            
            // Extract token info if available
            if (payload.TokenInfo?.Token) {
              // Update the registration data with token information
              const updatedRegData = {
                ...regData.registration_data,
                paymentToken: {
                  token: payload.TokenInfo.Token,
                  expiry: payload.TokenInfo.TokenExDate,
                  last4Digits: payload.TranzactionInfo?.Last4CardDigits || ''
                }
              };
              
              // Store updated registration data
              await supabaseClient
                .from('temp_registration_data')
                .update({
                  registration_data: updatedRegData,
                  payment_processed: true
                })
                .eq('id', payload.ReturnValue);
            }
          }
        }
        
        // Return success response
        return new Response(
          JSON.stringify({ 
            success: true 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } catch (error: any) {
        console.error('Error processing payment notification:', error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }
    }

    // If no valid path is provided
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Invalid endpoint' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
