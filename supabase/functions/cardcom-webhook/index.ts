import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// CardCom IP whitelist
const CARDCOM_IPS = [
  '81.218.0.0/16',  // CardCom IP range
  '81.219.0.0/16'   // CardCom IP range
];

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,    // 100 requests per minute
};

// In-memory store for rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function isIpInRange(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - parseInt(bits))) - 1);
  const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  const rangeNum = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
  return (ipNum & mask) === (rangeNum & mask);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function verifyCardcomRequest(req: Request): { allowed: boolean; reason?: string } {
  // Get client IP
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  if (!clientIp) {
    return { allowed: false, reason: 'No client IP found in request' };
  }

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return { allowed: false, reason: 'Rate limit exceeded' };
  }

  // Check if IP is in whitelist
  const isAllowed = CARDCOM_IPS.some(cidr => isIpInRange(clientIp, cidr));
  if (!isAllowed) {
    return { allowed: false, reason: `Request from unauthorized IP: ${clientIp}` };
  }

  return { allowed: true };
}

// No auth verification needed for webhooks
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Verify request is from CardCom
  const verification = verifyCardcomRequest(req);
  if (!verification.allowed) {
    console.error('Unauthorized request:', verification.reason);
    return new Response(
      JSON.stringify({ error: 'Unauthorized request', reason: verification.reason }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      }
    );
  }

  try {
    // Create a Supabase client with service role (since this is a webhook)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Parse request body
    const payload = await req.json();
    
    console.log('Received webhook notification:', JSON.stringify(payload));
    
    // Log the webhook data in Supabase
    const { data: logData, error: logError } = await supabaseClient
      .from('payment_webhooks')
      .insert({
        webhook_type: 'cardcom',
        payload: payload,
        processed: false,
        client_ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        received_at: new Date().toISOString()
      });
    
    if (logError) {
      console.error('Error logging webhook:', logError);
      throw logError;
    }
    
    // Process the webhook based on the payload data
    // CardCom webhook contains information about the transaction
    const { 
      ResponseCode, 
      LowProfileId, 
      TranzactionId, 
      ReturnValue,
      TokenInfo,
      TranzactionInfo,
      UIValues,
      Operation 
    } = payload;
    
    // Log the webhook data details
    console.log('Processing webhook data:', {
      ResponseCode,
      LowProfileId,
      TranzactionId,
      ReturnValue,
      hasTokenInfo: !!TokenInfo,
      hasTranzactionInfo: !!TranzactionInfo,
      hasUIValues: !!UIValues,
      Operation
    });

    let processingResult = {
      success: false,
      message: 'Not processed',
      details: null
    };

    // Only process successful transactions
    if (ResponseCode === 0) {
      try {
        // Validate token information if this is a token operation
        if ((Operation === "ChargeAndCreateToken" || Operation === "CreateTokenOnly") && !TokenInfo?.Token) {
          console.error('Token operation missing required TokenInfo.Token:', Operation);
          processingResult = {
            success: false, 
            message: 'Missing required token information for token operation',
            details: { operation: Operation }
          };
        } else if (ReturnValue) {
          // Consistent check for temp registration IDs - only check for temp_reg_ prefix
          if (ReturnValue.startsWith('temp_reg_')) {
            // This is a temporary registration ID - process as guest checkout
            await processRegistrationPayment(supabaseClient, ReturnValue, payload);
            processingResult = { 
              success: true, 
              message: 'Processed registration payment', 
              details: { registrationId: ReturnValue }
            };
          } else if (ReturnValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // This is a UUID - process as user payment
            await processUserPayment(supabaseClient, ReturnValue, payload);
            processingResult = { 
              success: true, 
              message: 'Processed user payment', 
              details: { userId: ReturnValue }
            };
          } else {
            // Fallback to email lookup if ReturnValue is not recognized
            if (UIValues && UIValues.CardOwnerEmail) {
              const email = UIValues.CardOwnerEmail;
              console.log('Attempting to find user by email:', email);
              
              // Call get-user-by-email function to look up user
              const { data: userData, error: userError } = await supabaseClient.functions.invoke('get-user-by-email', {
                body: { email: email.toLowerCase() }
              });

              if (!userError && userData?.user?.id) {
                const userId = userData.user.id;
                console.log(`Found user with email ${email}, ID: ${userId}`);
                
                // Process as a regular user payment
                await processUserPayment(supabaseClient, userId, payload);
                processingResult = { 
                  success: true, 
                  message: 'Processed user payment via email lookup', 
                  details: { userId, email }
                };
              } else {
                console.log(`No user found with email ${email} using get-user-by-email function`);
                
                // Direct lookup in auth.users table as fallback
                const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers({
                  filters: [
                    {
                      property: 'email',
                      operator: 'eq',
                      value: email.toLowerCase()
                    }
                  ]
                });

                if (!authError && authUsers?.users && authUsers.users.length > 0) {
                  const userId = authUsers.users[0].id;
                  console.log(`Found user with email ${email} directly in auth.users, ID: ${userId}`);
                  
                  // Process as a regular user payment
                  await processUserPayment(supabaseClient, userId, payload);
                  processingResult = { 
                    success: true, 
                    message: 'Processed user payment via direct auth.users lookup', 
                    details: { userId, email }
                  };
                } else {
                  console.log(`No user found with email ${email} in auth.users`);
                  processingResult = {
                    success: false,
                    message: 'User not found by email via any method',
                    details: { ReturnValue, email }
                  };
                }
              }
            } else {
              console.error('Invalid ReturnValue and no email to look up user:', ReturnValue);
              processingResult = {
                success: false,
                message: 'Invalid ReturnValue and no email available',
                details: { ReturnValue }
              };
            }
          }
        } else {
          // No ReturnValue, try to use email
          if (UIValues && UIValues.CardOwnerEmail) {
            const email = UIValues.CardOwnerEmail;
            console.log('No ReturnValue. Attempting to find user by email:', email);
            
            // Call get-user-by-email function to look up user
            const { data: userData, error: userError } = await supabaseClient.functions.invoke('get-user-by-email', {
              body: { email: email.toLowerCase() }
            });

            if (!userError && userData?.user?.id) {
              const userId = userData.user.id;
              console.log(`Found user with email ${email}, ID: ${userId}`);
              
              // Process as a regular user payment
              await processUserPayment(supabaseClient, userId, payload);
              processingResult = { 
                success: true, 
                message: 'Processed user payment via email lookup', 
                details: { userId, email }
              };
            } else {
              console.log(`No user found with email ${email} using get-user-by-email function`);
              
              // Direct lookup in auth.users table as fallback
              const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers({
                filters: [
                  {
                    property: 'email',
                    operator: 'eq',
                    value: email.toLowerCase()
                  }
                ]
              });

              if (!authError && authUsers?.users && authUsers.users.length > 0) {
                const userId = authUsers.users[0].id;
                console.log(`Found user with email ${email} directly in auth.users, ID: ${userId}`);
                
                // Process as a regular user payment
                await processUserPayment(supabaseClient, userId, payload);
                processingResult = { 
                  success: true, 
                  message: 'Processed user payment via direct auth.users lookup', 
                  details: { userId, email }
                };
              } else {
                console.log(`No user found with email ${email} in auth.users`);
                processingResult = {
                  success: false,
                  message: 'User not found by email via any method',
                  details: { email }
                };
              }
            }
          } else {
            console.error('No ReturnValue and no email to look up user');
            processingResult = {
              success: false,
              message: 'No ReturnValue and no email available',
              details: null
            };
          }
        }
      } catch (processingError) {
        console.error('Error during webhook processing:', processingError);
        processingResult = {
          success: false,
          message: 'Error during webhook processing',
          details: { error: processingError.message }
        };
      }
    } else {
      // Failed transaction
      processingResult = {
        success: false,
        message: `Transaction failed with code ${ResponseCode}`,
        details: { ResponseCode, Description: payload.Description }
      };
    }

    // Mark webhook as processed and store the result
    if (logData && logData.length > 0) {
      await supabaseClient
        .from('payment_webhooks')
        .update({ 
          processed: true,
          processed_at: new Date().toISOString(),
          processing_result: processingResult
        })
        .eq('id', logData[0].id);
    }

    // Acknowledge receipt of webhook
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received and processed',
        processingResult
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 to acknowledge receipt (webhook best practice)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error processing webhook',
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200, // Always return 200 for webhooks
      }
    );
  }
});

// Process payment for registered user
async function processUserPayment(supabase: any, userId: string, payload: any) {
  console.log(`Processing payment for user: ${userId}`);
  
  // Extract token information if available
  const tokenInfo = payload.TokenInfo;
  const transactionInfo = payload.TranzactionInfo;
  const operation = payload.Operation;

  // Determine subscription status and period
  let subscriptionStatus = 'active';
  let currentPeriodEndsAt = new Date();
  
  if (operation === "CreateTokenOnly") {
    // Monthly plan with trial
    subscriptionStatus = 'trial';
    currentPeriodEndsAt.setDate(currentPeriodEndsAt.getDate() + 30); // 30 days trial
  } else if (operation === "ChargeAndCreateToken") {
    // Annual plan
    currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1); // 1 year
  } else if (operation === "ChargeOnly") {
    // VIP plan - lifetime access
    currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 100); // Effectively lifetime
  }

  try {
    // Update user's subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: subscriptionStatus,
        payment_method: 'cardcom',
        last_payment_date: new Date().toISOString(),
        current_period_ends_at: currentPeriodEndsAt.toISOString(),
        payment_details: {
          transaction_id: payload.TranzactionId,
          low_profile_id: payload.LowProfileId,
          amount: transactionInfo?.Amount || payload.Amount || 0,
          response_code: payload.ResponseCode,
          operation: operation,
          card_info: transactionInfo ? {
            last4: transactionInfo.Last4CardDigits,
            expiry: `${transactionInfo.CardMonth}/${transactionInfo.CardYear}`,
            card_name: transactionInfo.CardName,
            card_type: transactionInfo.CardInfo
          } : null,
          token_info: tokenInfo ? {
            token: tokenInfo.Token,
            expiry: tokenInfo.TokenExDate,
            approval: tokenInfo.TokenApprovalNumber
          } : null
        }
      });
    
    if (subscriptionError) {
      console.error('Error updating user subscription:', subscriptionError);
      throw new Error(`Failed to update subscription: ${subscriptionError.message}`);
    }

    // If we have token info, store it in recurring_payments table
    if (tokenInfo && tokenInfo.Token) {
      console.log(`Storing token for user: ${userId}`);
      
      // Ensure all required fields are present and valid
      if (!tokenInfo.TokenExDate) {
        throw new Error('Missing TokenExDate in token information');
      }
      
      // Save the token to recurring_payments
      const { error: tokenError } = await supabase
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: tokenInfo.Token,
          token_expiry: parseCardcomDateString(tokenInfo.TokenExDate),
          token_approval_number: tokenInfo.TokenApprovalNumber || '',
          last_4_digits: transactionInfo?.Last4CardDigits || null,
          card_type: transactionInfo?.CardInfo || null,
          status: 'active',
          is_valid: true
        });
        
      if (tokenError) {
        console.error('Error storing token:', tokenError);
        throw new Error(`Failed to store token: ${tokenError.message}`);
      }
    } else if (payload.ResponseCode === 0 && (operation === "ChargeAndCreateToken" || operation === "CreateTokenOnly")) {
      console.error('Missing TokenInfo in successful token operation', { operation, ResponseCode: payload.ResponseCode });
    }

    // Log the payment in user_payment_logs
    const { error: logError } = await supabase
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        subscription_id: userId,
        token: payload.LowProfileId,
        amount: transactionInfo?.Amount || payload.Amount || 0,
        status: payload.ResponseCode === 0 ? 'payment_success' : 'payment_failed',
        transaction_id: payload.TranzactionId?.toString() || null,
        payment_data: {
          operation: operation,
          response_code: payload.ResponseCode,
          low_profile_id: payload.LowProfileId,
          card_info: transactionInfo ? {
            last4: transactionInfo.Last4CardDigits,
            expiry: `${transactionInfo.CardMonth}/${transactionInfo.CardYear}`
          } : null,
          token_info: tokenInfo ? {
            token: tokenInfo.Token,
            expiry: tokenInfo.TokenExDate
          } : null
        }
      });
      
    if (logError) {
      console.error('Error logging payment:', logError);
      throw new Error(`Failed to log payment: ${logError.message}`);
    }

    console.log(`Successfully processed payment for user: ${userId}`);
  } catch (error) {
    console.error('Error in processUserPayment:', error);
    throw error;
  }
}

// Process payment for temporary registration
async function processRegistrationPayment(supabase: any, regId: string, payload: any) {
  console.log(`Processing payment for registration: ${regId}`);
  
  // Extract the actual ID from the temp_reg_ prefix
  const actualId = regId.startsWith('temp_reg_') ? regId.substring(9) : regId;
  
  try {
    // Get the registration data
    const { data: regData, error: regError } = await supabase
      .from('temp_registration_data')
      .select('registration_data')
      .eq('id', actualId)
      .single();
      
    if (regError || !regData?.registration_data) {
      console.error('Error retrieving registration data:', regError);
      throw new Error('Registration data not found');
    }

    const registrationData = regData.registration_data;
    const { email, userData } = registrationData;

    // Create the user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        fullName: userData.fullName,
        phone: userData.phone,
        idNumber: userData.idNumber
      }
    });

    if (authError || !authData.user) {
      console.error('Error creating user account:', authError);
      throw new Error('Failed to create user account');
    }

    const userId = authData.user.id;

    // Determine subscription status and period
    let subscriptionStatus = 'active';
    let currentPeriodEndsAt = new Date();
    
    if (payload.Operation === "CreateTokenOnly") {
      subscriptionStatus = 'trial';
      currentPeriodEndsAt.setDate(currentPeriodEndsAt.getDate() + 30);
    } else if (payload.Operation === "ChargeAndCreateToken") {
      currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 1);
    } else if (payload.Operation === "ChargeOnly") {
      currentPeriodEndsAt.setFullYear(currentPeriodEndsAt.getFullYear() + 100);
    }

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: subscriptionStatus,
        payment_method: 'cardcom',
        last_payment_date: new Date().toISOString(),
        current_period_ends_at: currentPeriodEndsAt.toISOString(),
        payment_details: {
          transaction_id: payload.TranzactionId,
          low_profile_id: payload.LowProfileId,
          amount: payload.Amount,
          response_code: payload.ResponseCode,
          operation: payload.Operation,
          card_info: payload.TranzactionInfo ? {
            last4: payload.TranzactionInfo.Last4CardDigits,
            expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`,
            card_name: payload.TranzactionInfo.CardName,
            card_type: payload.TranzactionInfo.CardInfo
          } : null,
          token_info: payload.TokenInfo ? {
            token: payload.TokenInfo.Token,
            expiry: payload.TokenInfo.TokenExDate,
            approval: payload.TokenInfo.TokenApprovalNumber
          } : null
        }
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      throw new Error('Failed to create subscription');
    }

    // Store token if available
    if (payload.TokenInfo?.Token) {
      const { error: tokenError } = await supabase
        .from('recurring_payments')
        .insert({
          user_id: userId,
          token: payload.TokenInfo.Token,
          token_expiry: parseCardcomDateString(payload.TokenInfo.TokenExDate),
          token_approval_number: payload.TokenInfo.TokenApprovalNumber || '',
          last_4_digits: payload.TranzactionInfo?.Last4CardDigits || null,
          card_type: payload.TranzactionInfo?.CardInfo || null,
          status: 'active',
          is_valid: true
        });

      if (tokenError) {
        console.error('Error storing token:', tokenError);
        throw new Error('Failed to store payment token');
      }
    }

    // Log the payment
    const { error: logError } = await supabase
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        subscription_id: userId,
        token: payload.LowProfileId,
        amount: payload.Amount,
        status: payload.ResponseCode === 0 ? 'payment_success' : 'payment_failed',
        transaction_id: payload.TranzactionId?.toString() || null,
        payment_data: {
          operation: payload.Operation,
          response_code: payload.ResponseCode,
          low_profile_id: payload.LowProfileId,
          card_info: payload.TranzactionInfo ? {
            last4: payload.TranzactionInfo.Last4CardDigits,
            expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
          } : null,
          token_info: payload.TokenInfo ? {
            token: payload.TokenInfo.Token,
            expiry: payload.TokenInfo.TokenExDate
          } : null
        }
      });

    if (logError) {
      console.error('Error logging payment:', logError);
      throw new Error('Failed to log payment');
    }

    // Mark registration as processed
    await supabase
      .from('temp_registration_data')
      .update({ 
        payment_verified: true,
        payment_processed: true,
        user_id: userId,
        payment_details: {
          transaction_id: payload.TranzactionId,
          low_profile_id: payload.LowProfileId,
          amount: payload.Amount,
          response_code: payload.ResponseCode,
          operation: payload.Operation
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', actualId);

    console.log(`Successfully processed registration payment for user: ${userId}`);
    return userId;
  } catch (error) {
    console.error('Error processing registration payment:', error);
    throw error;
  }
}

// Helper function to parse Cardcom date string format (YYYYMMDD) to ISO date
function parseCardcomDateString(dateStr: string): string {
  try {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    // Return in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error parsing date string:', error);
    // Return current date as fallback
    return new Date().toISOString().split('T')[0];
  }
}
