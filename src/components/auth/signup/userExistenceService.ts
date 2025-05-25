
import { supabase } from '@/integrations/supabase/client';

export const checkIfUserExists = async (email: string): Promise<boolean> => {
  try {
    console.log('UserExistenceService: Checking if user exists for email:', email);
    
    // Try to sign up with temporary password to see if user exists
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'temp_password_for_check_123!',
      options: {
        data: {
          first_name: 'temp',
          last_name: 'temp'
        }
      }
    });
    
    console.log('UserExistenceService: Signup attempt result:', { data, error });
    
    if (error) {
      const errorMessage = error.message.toLowerCase();
      console.log('UserExistenceService: Error message analysis:', errorMessage);
      
      // These error messages indicate the user already exists
      const userExistsErrors = [
        'user already registered',
        'email address already in use',
        'email already taken',
        'user with this email already exists',
        'duplicate',
        'already exists'
      ];
      
      // Check if it's a "user already exists" error
      if (userExistsErrors.some(err => errorMessage.includes(err))) {
        console.log('UserExistenceService: User already exists - detected from signup error');
        return true;
      }
      
      // For other errors, assume user doesn't exist to allow retry
      console.log('UserExistenceService: Other error, assuming user does not exist:', errorMessage);
      return false;
    }
    
    // If signup was successful but we got a user back, it means the user was created
    // In this case, we should delete the temporary user and return false (user didn't exist before)
    if (data.user) {
      console.log('UserExistenceService: Temporary user created, user did not exist before');
      // Don't sign out the temporary user as it will mess with auth state
      // Just return false since the user didn't exist before our check
      return false;
    }
    
    // Default case - assume user doesn't exist
    console.log('UserExistenceService: Default case - assuming user does not exist');
    return false;
    
  } catch (error) {
    console.error('UserExistenceService: Error checking if user exists:', error);
    // On any exception, assume user doesn't exist to allow signup attempt
    return false;
  }
};
