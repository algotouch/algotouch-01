
import { supabase } from '@/integrations/supabase/client';
import { RegistrationData, TokenData } from '@/types/payment';

interface RegisterUserParams {
  registrationData: RegistrationData;
  tokenData: TokenData;
}

export const registerUser = async ({ registrationData, tokenData }: RegisterUserParams) => {
  try {
    console.log('Starting user registration process...');
    
    // Validate required data
    if (!registrationData.email || !registrationData.password) {
      throw new Error('נתוני התחברות חסרים - דרוש מייל וסיסמה');
    }

    if (!registrationData.userData?.firstName || !registrationData.userData?.lastName) {
      throw new Error('נתוני משתמש חסרים - דרוש שם פרטי ושם משפחה');
    }

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
      console.error('Supabase auth error:', userError);
      throw userError;
    }
    
    if (!userData.user) {
      throw new Error('יצירת משתמש נכשלה');
    }

    console.log('User created successfully:', userData.user.id);

    // Add a delay to ensure the user is created before proceeding
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
    
    // Convert TokenData to Json type for Supabase
    const paymentMethodJson = {
      token: String(tokenData.token || `sim_${Date.now()}`),
      lastFourDigits: tokenData.lastFourDigits,
      expiryMonth: tokenData.expiryMonth,
      expiryYear: tokenData.expiryYear,
      cardholderName: tokenData.cardholderName
    };
    
    // Create the subscription record
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        plan_type: registrationData.planId || 'monthly',
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

    console.log('Subscription created successfully');
    
    // Create payment history record
    await supabase.from('user_payment_logs').insert({
      user_id: userData.user.id,
      subscription_id: userData.user.id, // Use user ID as temporary subscription ID
      amount: 0,
      status: 'trial_started',
      payment_method: paymentMethodJson,
      token: `trial_${userData.user.id}`,
      currency: 'ILS'
    });

    console.log('Payment log created successfully');
    
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

    console.log('Profile updated successfully');
    
    // Store contract signature if available
    if (registrationData.contractDetails && registrationData.contractDetails.contractHtml && registrationData.contractDetails.signature) {
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
            plan_id: registrationData.planId || 'monthly',
            full_name: `${registrationData.userData.firstName} ${registrationData.userData.lastName}`,
            email: registrationData.email,
            phone: registrationData.userData.phone || null,
            signature: registrationData.contractDetails.signature,
            contract_html: registrationData.contractDetails.contractHtml,
            ip_address: ipAddress,
            user_agent: registrationData.contractDetails.browserInfo?.userAgent || navigator.userAgent,
            browser_info: registrationData.contractDetails.browserInfo || {
              language: navigator.language,
              platform: navigator.platform,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            contract_version: registrationData.contractDetails.contractVersion || "1.0",
            agreed_to_terms: registrationData.contractDetails.agreedToTerms || false,
            agreed_to_privacy: registrationData.contractDetails.agreedToPrivacy || false,
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
    
    // Mark temp registration as used
    const tempRegId = localStorage.getItem('temp_registration_id');
    if (tempRegId) {
      try {
        // We don't have direct access to temp_registration_data table, so we'll just remove the local storage
        localStorage.removeItem('temp_registration_id');
      } catch (e) {
        console.log('Could not mark temp registration as used, continuing...');
      }
    }
    
    // Clean up session storage
    sessionStorage.removeItem('registration_data');
    
    console.log('Registration completed successfully');
    
    return { 
      success: true, 
      userId: userData.user.id,
      registrationId: userData.user.id 
    };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: new Error(error.message || 'שגיאה בתהליך ההרשמה') 
    };
  }
};
