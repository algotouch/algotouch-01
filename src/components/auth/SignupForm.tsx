
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useSimpleRegistrationData } from '@/hooks/useSimpleRegistrationData';
import { validateSignupInputs } from './signup/validationUtils';
import { handleSignupProcess } from './signup/signupService';
import SignupFormFields from './signup/SignupFormFields';
import ExistingUserAlert from './signup/ExistingUserAlert';

interface SignupFormProps {
  onSignupSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess, onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { updateRegistrationData, clearRegistrationData } = useSimpleRegistrationData();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showExistingUserError, setShowExistingUserError] = useState(false);

  const startRegistering = () => {
    console.log('SignupForm: Starting registration process');
    updateRegistrationData({
      email,
      password,
      userData: { firstName, lastName, phone },
      registrationTime: new Date().toISOString()
    });
  };

  const navigateToSubscription = async () => {
    console.log('SignupForm: Starting enhanced navigation process');
    
    // Wait for context and sessionStorage to be fully updated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify data is in sessionStorage
    const storedData = sessionStorage.getItem('registration_data');
    if (!storedData) {
      console.error('SignupForm: No data found in sessionStorage before navigation');
      return false;
    }
    
    console.log('SignupForm: Data confirmed in sessionStorage, proceeding with navigation');
    
    // Force a page refresh approach by setting a flag and navigating
    sessionStorage.setItem('force_subscription_access', 'true');
    
    // Try navigation with enhanced retry mechanism
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`SignupForm: Enhanced navigation attempt ${attempt}/${maxRetries}`);
      
      try {
        // Use replace to avoid back button issues
        navigate('/subscription', { replace: true });
        console.log('SignupForm: Navigation call completed');
        
        // Wait longer to see if navigation succeeded
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if we're on the subscription page
        if (window.location.pathname === '/subscription') {
          console.log('SignupForm: Successfully navigated to subscription page');
          sessionStorage.removeItem('force_subscription_access');
          return true;
        } else {
          console.log('SignupForm: Navigation failed, current path:', window.location.pathname);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          }
        }
      } catch (error) {
        console.error(`SignupForm: Navigation attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    console.error('SignupForm: All enhanced navigation attempts failed');
    sessionStorage.removeItem('force_subscription_access');
    return false;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowExistingUserError(false);
    
    console.log('SignupForm: Handle signup clicked');
    
    // Validate inputs
    const validationErrors = validateSignupInputs(firstName, lastName, email, phone, password, passwordConfirm);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      console.log('SignupForm: Validation errors found:', validationErrors);
      return;
    }
    
    setSigningUp(true);
    
    try {
      const result = await handleSignupProcess(
        email,
        password,
        firstName,
        lastName,
        phone,
        updateRegistrationData,
        startRegistering,
        clearRegistrationData
      );
      
      if (result.success) {
        console.log('SignupForm: Registration successful, starting enhanced navigation');
        
        const navigationSuccess = await navigateToSubscription();
        
        if (navigationSuccess && onSignupSuccess) {
          onSignupSuccess();
        } else if (!navigationSuccess) {
          console.error('SignupForm: Navigation failed, but registration was successful');
          // Still consider this a success as the data is saved
          if (onSignupSuccess) {
            onSignupSuccess();
          }
        }
      } else if (result.userExists) {
        console.log('SignupForm: User already exists');
        setShowExistingUserError(true);
      }
    } catch (error) {
      console.error('SignupForm: Error during signup:', error);
    } finally {
      setSigningUp(false);
    }
  };

  const handleLoginRedirect = () => {
    if (onSwitchToLogin) {
      onSwitchToLogin();
    } else {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'login');
      navigate(currentUrl.pathname + currentUrl.search, { replace: true });
    }
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>הרשמה</CardTitle>
        <CardDescription>צור חשבון חדש כדי להתחיל</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {showExistingUserError && (
            <ExistingUserAlert onSwitchToLogin={handleLoginRedirect} />
          )}
          
          <SignupFormFields
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            password={password}
            setPassword={setPassword}
            passwordConfirm={passwordConfirm}
            setPasswordConfirm={setPasswordConfirm}
            errors={errors}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={signingUp}>
            {signingUp ? 'שומר נתונים...' : 'המשך לבחירת תכנית'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignupForm;
