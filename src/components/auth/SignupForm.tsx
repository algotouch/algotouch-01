
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
    console.log('SignupForm: Starting navigation process');
    
    // Wait a bit for context to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try navigation with retry mechanism
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`SignupForm: Navigation attempt ${attempt}/${maxRetries}`);
      
      try {
        navigate('/subscription', { replace: true });
        console.log('SignupForm: Navigation completed');
        
        // Wait to see if navigation succeeded
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check if we're on the subscription page
        if (window.location.pathname === '/subscription') {
          console.log('SignupForm: Successfully navigated to subscription page');
          return true;
        } else {
          console.log('SignupForm: Navigation failed, current path:', window.location.pathname);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error(`SignupForm: Navigation attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    console.error('SignupForm: All navigation attempts failed');
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
        console.log('SignupForm: Registration successful, starting navigation');
        
        // Ensure context is updated before navigation
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const navigationSuccess = await navigateToSubscription();
        
        if (navigationSuccess && onSignupSuccess) {
          onSignupSuccess();
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
            {signingUp ? 'בודק נתונים...' : 'המשך לבחירת תכנית'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignupForm;
