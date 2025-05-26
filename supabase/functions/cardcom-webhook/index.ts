
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// No auth verification needed for webhooks
serve(async (req) => {
  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
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
        processed: false
      });
    
    if (logError) {
      console.error('Error logging webhook:', logError);
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

  // Update user's subscription status
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      status: (operation === "CreateTokenOnly") ? 'trial' : 'active',
      payment_method: 'cardcom',
      last_payment_date: new Date().toISOString(),
      // If we have token information and it's a ChargeAndCreateToken or CreateTokenOnly operation
      // then store the token in the payment_method column
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
  
  if (error) {
    console.error('Error updating user subscription:', error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // If we have token info, store it in recurring_payments table
  if (tokenInfo && tokenInfo.Token) {
    console.log(`Storing token for user: ${userId}, token: ${tokenInfo.Token}`);
    
    try {
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
          token_approval_number: tokenInfo.TokenApprovalNumber || '', // Ensure it's never null
          last_4_digits: transactionInfo?.Last4CardDigits || null,
          card_type: transactionInfo?.CardInfo || null,
          status: 'active',
          is_valid: true
        });
        
      if (tokenError) {
        console.error('Error storing token:', tokenError);
        throw new Error(`Failed to store token: ${tokenError.message}`);
      } else {
        console.log('Token stored successfully');
      }
    } catch (tokenSaveError) {
      console.error('Error in token storage:', tokenSaveError);
      throw tokenSaveError;
    }
  } else if (payload.ResponseCode === 0 && (operation === "ChargeAndCreateToken" || operation === "CreateTokenOnly")) {
    console.error('Missing TokenInfo in successful token operation', { operation, ResponseCode: payload.ResponseCode });
  }

  // Log the payment in user_payment_logs
  try {
    const { error: logError } = await supabase
      .from('user_payment_logs')
      .insert({
        user_id: userId,
        subscription_id: userId, // Using user_id as subscription_id as per existing pattern
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
    }
  } catch (logSaveError) {
    console.error('Error in payment logging:', logSaveError);
  }
}

// Process payment for temporary registration
async function processRegistrationPayment(supabase: any, regId: string, payload: any) {
  console.log(`Processing payment for registration: ${regId}`);
  
  // Extract the actual ID from the temp_reg_ prefix
  const actualId = regId.startsWith('temp_reg_') ? regId.substring(9) : regId;
  
  // Mark the payment as verified in the registration data
  try {
    const { error } = await supabase
      .from('temp_registration_data')
      .update({ 
        payment_verified: true,
        payment_details: {
          transaction_id: payload.TranzactionId,
          low_profile_id: payload.LowProfileId,
          amount: payload.Amount,
          response_code: payload.ResponseCode,
          card_info: payload.TranzactionInfo ? {
            last4: payload.TranzactionInfo.Last4CardDigits,
            expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
          } : null,
          token_info: payload.TokenInfo ? {
            token: payload.TokenInfo.Token,
            expiry: payload.TokenInfo.TokenExDate,
            approval: payload.TokenInfo.TokenApprovalNumber
          } : null
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', actualId);
  
    if (error) {
      // If we couldn't find the record with the exact ID, try alternative formats
      console.error('Error updating registration payment status:', error);
      
      // Try to find registration by partial match (without prefix)
      const { data: regData, error: searchError } = await supabase
        .from('temp_registration_data')
        .select('id, registration_data')
        .filter('id', 'ilike', `%${actualId.substring(0, 8)}%`)
        .limit(1);
      
      if (!searchError && regData && regData.length > 0) {
        // Found a matching registration
        const matchedRegId = regData[0].id;
        console.log(`Found matching registration ID: ${matchedRegId}`);
        
        // Update the found registration
        const { error: updateError } = await supabase
          .from('temp_registration_data')
          .update({ 
            payment_verified: true,
            payment_details: {
              transaction_id: payload.TranzactionId,
              low_profile_id: payload.LowProfileId,
              amount: payload.Amount,
              response_code: payload.ResponseCode,
              card_info: payload.TranzactionInfo ? {
                last4: payload.TranzactionInfo.Last4CardDigits,
                expiry: `${payload.TranzactionInfo.CardMonth}/${payload.TranzactionInfo.CardYear}`
              } : null,
              token_info: payload.TokenInfo ? {
                token: payload.TokenInfo.Token,
                expiry: payload.TokenInfo.TokenExDate,
                approval: payload.TokenInfo.TokenApprovalNumber
              } : null
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedRegId);
          
        if (updateError) {
          console.error('Error updating matched registration:', updateError);
          throw updateError;
        }
      } else {
        // Still can't find any matching registration, create a new one
        if (payload.UIValues && payload.UIValues.CardOwnerEmail) {
          console.log('Creating new temp registration with email:', payload.UIValues.CardOwnerEmail);
          
          const { error: insertError } = await supabase
            .from('temp_registration_data')
            .insert({
              id: actualId,
              registration_data: {
                email: payload.UIValues.CardOwnerEmail,
                userData: {
                  fullName: payload.UIValues.CardOwnerName || '',
                  phone: payload.UIValues.CardOwnerPhone || '',
                  idNumber: payload.UIValues.CardOwnerIdentityNumber || ''
                },
                paymentToken: payload.TokenInfo ? {
                  token: payload.TokenInfo.Token,
                  expiry: payload.TokenInfo.TokenExDate,
                  last4Digits: payload.TranzactionInfo?.Last4CardDigits || ''
                } : null,
                registrationTime: new Date().toISOString()
              },
              payment_verified: true,
              payment_details: {
                transaction_id: payload.TranzactionId,
                low_profile_id: payload.LowProfileId,
                amount: payload.Amount,
                response_code: payload.ResponseCode,
                operation: payload.Operation
              },
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            });
            
          if (insertError) {
            console.error('Error creating new registration:', insertError);
            throw insertError;
          }
        } else {
          throw error; // No way to create a registration without email
        }
      }
    }
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
