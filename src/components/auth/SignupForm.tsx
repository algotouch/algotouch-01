
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
        console.log('SignupForm: Registration successful');
        
        // Force navigation to subscription page
        console.log('SignupForm: Navigating to subscription page');
        navigate('/subscription', { replace: true });
        
        if (onSignupSuccess) {
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
