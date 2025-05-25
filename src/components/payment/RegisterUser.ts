
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TokenData } from './utils/paymentHelpers';
import { Json } from '@/integrations/supabase/types';

interface RegisterUserParams {
  registrationData: any;
  tokenData: TokenData;
  contractDetails?: {
    contractHtml?: string;
    signature?: string;
    agreedToTerms?: boolean;
    agreedToPrivacy?: boolean;
    contractVersion?: string;
    browserInfo?: any;
  } | null;
}

interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: any;
}

export const registerUser = async ({ registrationData, tokenData, contractDetails }: RegisterUserParams): Promise<RegisterResult> => {
  try {
    // Create the user account
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          first_name: registrationData.userData.firstName,
          last_name: registrationData.userData.lastName,
          registration_complete: true,
          signup_step: 'completed',
          signup_date: new Date().toISOString()
        }
      }
    });
    
    if (userError) {
      throw userError;
    }
    
    if (!userData.user) {
      throw new Error('יצירת משתמש נכשלה');
    }

    // Add a delay to ensure the user is created before proceeding
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
    
    // Convert TokenData to Json type for Supabase
    const paymentMethodJson = tokenData as unknown as Json;
    
    // Create the subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        plan_type: registrationData.planId,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        payment_method: paymentMethodJson,
        contract_signed: true,
        contract_signed_at: new Date().toISOString()
      });
    
    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError);
      throw subscriptionError;
    }
    
    // Create payment history record using user_payment_logs table
    await supabase.from('user_payment_logs').insert({
      user_id: userData.user.id,
      subscription_id: userData.user.id,
      amount: 0,
      status: 'trial_started',
      payment_method: paymentMethodJson,
      token: `trial_${userData.user.id}`
    });
    
    // Update profile information
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: registrationData.userData.firstName,
        last_name: registrationData.userData.lastName,
        phone: registrationData.userData.phone
      })
      .eq('id', userData.user.id);
    
    if (profileError) {
      console.error('Error updating profile:', profileError);
    }
    
    // Store contract signature if available
    if (contractDetails && contractDetails.contractHtml && contractDetails.signature) {
      try {
        // Get client IP address (will be missing in development, that's ok)
        let ipAddress = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
          }
        } catch (e) {
          console.log('Could not get IP address, continuing without it');
        }
        
        // Store the contract signature
        const { error: signatureError } = await supabase
          .from('contract_signatures')
          .insert({
            user_id: userData.user.id,
            plan_id: registrationData.planId,
            full_name: `${registrationData.userData.firstName} ${registrationData.userData.lastName}`,
            email: registrationData.email,
            phone: registrationData.userData.phone || null,
            signature: contractDetails.signature,
            contract_html: contractDetails.contractHtml,
            ip_address: ipAddress,
            user_agent: contractDetails.browserInfo?.userAgent || navigator.userAgent,
            browser_info: contractDetails.browserInfo || {
              language: navigator.language,
              platform: navigator.platform,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            contract_version: contractDetails.contractVersion || "1.0",
            agreed_to_terms: contractDetails.agreedToTerms || false,
            agreed_to_privacy: contractDetails.agreedToPrivacy || false,
          });
          
        if (signatureError) {
          console.error('Error storing contract signature:', signatureError);
          // We don't throw here, as this is not critical to the registration process
        } else {
          console.log('Contract signature stored successfully');
        }
      } catch (signatureError) {
        console.error('Exception storing signature:', signatureError);
        // Continue with registration even if there's an error storing the contract
      }
    }
    
    return { success: true, userId: userData.user.id };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error };
  }
};
