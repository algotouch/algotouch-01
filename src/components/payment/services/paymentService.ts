
import { supabase } from '@/integrations/supabase/client';
import { TokenData } from '@/types/payment';
import { RegistrationResult } from '../hooks/types';
import { toast } from 'sonner'; 

// Import using a dynamic import to avoid circular dependencies
const importErrorHandling = async () => {
  return await import('../utils/errorHandling');
};

export const handleExistingUserPayment = async (
  userId: string,
  planId: string,
  tokenData: TokenData,
  operationType: number,
  planDetails: any
) => {
  const now = new Date();
  let trialEndsAt = null;
  let periodEndsAt = null;
  
  if (planId === 'monthly') {
    trialEndsAt = new Date(now);
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
  } else if (planId === 'annual') {
    periodEndsAt = new Date(now);
    periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
  }
  
  try {
    const { error: subscriptionError } = await supabase
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
      });
    
    if (subscriptionError) {
      throw new Error(`שגיאה בעדכון מנוי: ${subscriptionError.message}`);
    }
    
    const price = planDetails[planId as keyof typeof planDetails]?.price || 0;
    
    if (planId !== 'monthly' || operationType !== 3) {
      const { data: paymentData, error: paymentError } = await supabase
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: price,
          currency: 'USD',
          status: 'completed',
          payment_method: {
            ...tokenData,
            simulated: false 
          },
          token: tokenData.token?.toString() || `payment_${Date.now()}`
        })
        .select()
        .single();
        
      if (paymentError) {
        console.error('Payment record creation error:', paymentError);
        throw paymentError;
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('id', userId)
        .single();
      
      const { data: authData, error: authError } = await supabase.auth.getUser(userId);
      
      let userEmail = '';
      let userName = '';
      let userPhone = '';
      
      if (profileError) {
        console.error('Error fetching profile data for document:', profileError);
        if (authData?.user?.email) {
          userEmail = authData.user.email;
        }
      } else {
        userEmail = authData?.user?.email || '';
        userName = profileData ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : '';
        userPhone = profileData?.phone || '';
      }
      
      try {
        await supabase.functions.invoke('generate-document/generate', {
          body: {
            paymentId: paymentData.id,
            userId: userId,
            amount: price,
            planType: planId,
            email: userEmail,
            fullName: userName,
            documentType: 'invoice',
            phone: userPhone
          }
        });
      } catch (docError) {
        console.error('Error generating document:', docError);
        // Use dynamic import to avoid circular dependency
        const { logPaymentError } = await importErrorHandling();
        logPaymentError(docError, userId, 'document-generation', { 
          paymentId: paymentData.id,
          userId: userId 
        });
      }
    } else {
      await supabase
        .from('user_payment_logs')
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: 0,
          currency: 'USD',
          status: 'trial_started',
          payment_method: tokenData,
          token: `trial_${userId}`
        });
    }
  } catch (error) {
    // Use dynamic import to avoid circular dependency
    const { handlePaymentError } = await importErrorHandling();
    await handlePaymentError(error, userId, undefined, undefined, {
      paymentDetails: {
        userId,
        planId,
        operationType
      }
    });
    
    throw error;
  }
};

export const registerNewUser = async (
  registrationData: any,
  tokenData: TokenData
): Promise<RegistrationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('register-user', {
      body: {
        registrationData,
        tokenData: {
          ...tokenData,
          simulated: false
        },
        contractDetails: registrationData.contractDetails || null
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data?.success) {
      throw new Error(data?.error || 'שגיאה לא ידועה בתהליך ההרשמה');
    }
    
    if (registrationData.email && registrationData.password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password
      });
      
      if (signInError) {
        console.error("Error signing in after registration:", signInError);
      }
    }
    
    sessionStorage.removeItem('registration_data');
    
    return { success: true, userId: data.userId };
  } catch (error: any) {
    console.error("Registration error:", error);
    
    const registrationError = new Error(error.message || 'שגיאה בתהליך ההרשמה');
    throw registrationError;
  }
};

export const initiateExternalPayment = async (
  planId: string, 
  user: any, 
  registrationData: any
) => {
  try {
    let operationType = 3; // Default: token creation only (for monthly with free trial)
    
    if (planId === 'annual') {
      operationType = 2; // Charge and create token for recurring payments
    } else if (planId === 'vip') {
      operationType = 1; // Charge only for one-time payment
    }

    const userInfo = user 
      ? { userId: user.id, email: user.email }
      : registrationData
        ? { 
            fullName: `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim(),
            email: registrationData.email,
            registrationData
          }
        : { fullName: '', email: '' };

    const paymentSessionId = crypto.randomUUID();

    const payload = {
      planId,
      ...userInfo,
      operationType,
      paymentSessionId,
      successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${planId}`,
      errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${planId}&session=${paymentSessionId}`
    };

    const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
      body: payload
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.url) {
      throw new Error('לא התקבלה כתובת תשלום מהשרת');
    }
    
    // Instead of directly accessing the payment_sessions table, use an edge function
    if (user?.id || registrationData) {
      await supabase.functions.invoke('recover-payment-session/save-session', {
        body: {
          sessionId: paymentSessionId,
          userId: user?.id || null,
          email: user?.email || registrationData?.email || null,
          planId: planId,
          paymentDetails: payload,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });
    }
    
    return {
      ...data,
      sessionId: paymentSessionId
    };
  } catch (error) {
    // Use dynamic import to avoid circular dependency
    const { handlePaymentError } = await importErrorHandling();
    await handlePaymentError(error, user?.id, user?.email, undefined, {
      paymentDetails: {
        planId, 
        userId: user?.id,
        hasRegistrationData: !!registrationData
      }
    });
    
    throw error;
  }
};

export const generateDocument = async (
  userId: string,
  paymentId: string,
  documentType: 'invoice' | 'receipt' = 'receipt'
) => {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', userId)
      .single();
    
    const { data: authData, error: authError } = await supabase.auth.getUser(userId);
    
    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      throw new Error('שגיאה בטעינת פרטי משתמש');
    }
    
    if (authError) {
      console.error('Error fetching user data:', authError);
      throw new Error('שגיאה בטעינת פרטי משתמש');
    }
    
    const { data: paymentData, error: paymentError } = await supabase
      .from('user_payment_logs')
      .select('amount, subscription_id')
      .eq('id', paymentId)
      .single();
      
    if (paymentError) {
      console.error('Error fetching payment data:', paymentError);
      throw new Error('שגיאה בטעינת פרטי תשלום');
    }
    
    const { data: subscriptionData, error: subError } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', paymentData.subscription_id)
      .single();
      
    if (subError) {
      console.error('Error fetching subscription data:', subError);
      throw new Error('שגיאה בטעינת פרטי מנוי');
    }
    
    const userEmail = authData?.user?.email || '';
    const userName = profileData 
      ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() 
      : '';
    
    const { data, error } = await supabase.functions.invoke('generate-document/generate', {
      body: {
        paymentId,
        userId,
        amount: paymentData.amount,
        planType: subscriptionData.plan_type,
        email: userEmail,
        fullName: userName,
        documentType,
        phone: profileData?.phone || ''
      }
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Document generation error:', error);
    return { success: false, error: error.message };
  }
};

export const listUserDocuments = async (userId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-document/list', {
      body: { userId }
    });
    
    if (error) throw error;
    
    return { success: true, documents: data?.documents || [] };
  } catch (error: any) {
    console.error('Error listing documents:', error);
    return { success: false, error: error.message };
  }
};

export const getPaymentSystemHealth = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('payment-system-health', {
      body: {}
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Error checking payment system health:', error);
    return { success: false, error: error.message };
  }
};

export const retryFailedPayment = async (paymentId: string, userId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('retry-payment', {
      body: { paymentId, userId }
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    // Use dynamic import to avoid circular dependency
    const { handlePaymentError } = await importErrorHandling();
    await handlePaymentError(error, userId, undefined, undefined, {
      paymentDetails: { paymentId }
    });
    
    return { success: false, error: error.message };
  }
};

export const checkForExpiringCards = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('payment_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    
    if (data) {
      const expiryDate = new Date(data.token_expiry);
      const today = new Date();
      const daysUntilExpiry = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 30) {
        return {
          isExpiring: true,
          daysUntilExpiry,
          cardLastFour: data.card_last_four,
          expiryDate: data.token_expiry
        };
      }
    }
    
    return { isExpiring: false };
  } catch (error) {
    console.error('Error checking for expiring cards:', error);
    return { isExpiring: false, error: error.message };
  }
};

export const addAlternativePaymentMethod = async (userId: string, tokenData: TokenData) => {
  try {
    // Cast tokenData.token to ensure it's a string 
    const token = String(tokenData.token || `fallback_${Date.now()}`);
    
    const { data, error } = await supabase
      .from('payment_tokens')
      .insert({
        user_id: userId,
        token: token,
        token_expiry: `${tokenData.expiryYear}-${tokenData.expiryMonth}-01`,
        card_last_four: tokenData.lastFourDigits,
        is_active: true
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return { success: true, tokenId: data.id };
  } catch (error) {
    // Use dynamic import to avoid circular dependency
    const { handlePaymentError } = await importErrorHandling();
    await handlePaymentError(error, userId, undefined, undefined, {
      paymentDetails: { action: 'add-alternative-payment' }
    });
    
    return { success: false, error: error.message };
  }
};
