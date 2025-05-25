
import { toast } from 'sonner';
import { checkIfUserExists } from './userExistenceService';

export interface RegistrationData {
  email: string;
  password: string;
  userData: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  registrationTime: string;
}

export const handleSignupProcess = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone: string,
  updateRegistrationData: (data: any) => void,
  startRegistering: () => void,
  clearRegistrationData: () => void
): Promise<{ success: boolean; userExists?: boolean }> => {
  try {
    console.log('SignupService: Starting registration process for:', email);
    
    // First check if user already exists
    const userExists = await checkIfUserExists(email);
    console.log('SignupService: User exists check result:', userExists);
    
    if (userExists) {
      console.log('SignupService: User already exists, returning error');
      toast.error('המשתמש כבר קיים במערכת');
      return { success: false, userExists: true };
    }
    
    console.log('SignupService: User does not exist, proceeding with registration');
    
    // Clear any previous registration data
    clearRegistrationData();
    sessionStorage.removeItem('registration_data');
    
    // Save registration data to session storage and unified hook
    const registrationData: RegistrationData = {
      email,
      password,
      userData: {
        firstName,
        lastName,
        phone
      },
      registrationTime: new Date().toISOString()
    };
    
    console.log('SignupService: Saving registration data:', {
      email: registrationData.email,
      hasUserData: !!registrationData.userData,
      timestamp: registrationData.registrationTime
    });
    
    // Store in session storage FIRST
    sessionStorage.setItem('registration_data', JSON.stringify(registrationData));
    console.log('SignupService: Data saved to sessionStorage');
    
    // Update context
    updateRegistrationData(registrationData);
    console.log('SignupService: Context updated');
    
    // Mark as registering and pending subscription
    startRegistering();
    console.log('SignupService: Registration started');
    
    // Wait a bit for all state updates to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('SignupService: Registration data saved successfully');
    toast.success('הפרטים נשמרו בהצלחה - אנא בחר תכנית מנוי');
    
    return { success: true };
  } catch (error: any) {
    console.error('SignupService: Signup error:', error);
    
    // Check if it's a user already exists error (backup check)
    if (error.message?.includes('User already registered') || 
        error.message?.includes('already exists') ||
        error.message?.includes('user_repeated_signup')) {
      console.log('SignupService: User exists error caught in backup check');
      toast.error('המשתמש כבר קיים במערכת');
      return { success: false, userExists: true };
    } else {
      toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה');
      return { success: false };
    }
  }
};
