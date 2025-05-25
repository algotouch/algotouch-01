
import { supabase } from '@/integrations/supabase/client';
import { RegistrationData, TokenData } from '@/types/payment';

interface RegisterUserParams {
  registrationData: RegistrationData;
  tokenData: TokenData;
}

export const registerUser = async ({ registrationData, tokenData }: RegisterUserParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('register-user', {
      body: {
        registrationData,
        tokenData: {
          ...tokenData,
          token: String(tokenData.token || `sim_${Date.now()}`), // Ensure token is string
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
    
    return { 
      success: true, 
      userId: data.userId,
      registrationId: data.registrationId 
    };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { 
      success: false, 
      error: new Error(error.message || 'שגיאה בתהליך ההרשמה') 
    };
  }
};
