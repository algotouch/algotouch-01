import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useUnifiedRegistrationData } from '@/hooks/useUnifiedRegistrationData';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SignupFormProps {
  onSignupSuccess?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess }) => {
  const navigate = useNavigate();
  const { updateRegistrationData, startRegistering, clearRegistrationData } = useUnifiedRegistrationData();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showExistingUserError, setShowExistingUserError] = useState(false);

  const validateInputs = () => {
    const newErrors: {[key: string]: string} = {};
    
    // בדיקת שדות חובה
    if (!firstName.trim()) newErrors.firstName = 'שדה חובה';
    if (!lastName.trim()) newErrors.lastName = 'שדה חובה';
    
    // בדיקת תקינות מייל
    if (!email.trim()) {
      newErrors.email = 'שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'כתובת מייל לא תקינה';
    }
    
    // בדיקת תקינות סיסמה
    if (!password) {
      newErrors.password = 'שדה חובה';
    } else if (password.length < 6) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    }
    
    // בדיקת התאמת סיסמאות
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'הסיסמאות אינן תואמות';
    }
    
    // בדיקת תקינות מספר טלפון (אם הוזן)
    if (phone.trim() && !/^0[2-9]\d{7,8}$/.test(phone)) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkIfUserExists = async (email: string): Promise<boolean> => {
    try {
      console.log('SignupForm: Checking if user exists for email:', email);
      
      // Try to sign in with the email and a dummy password
      // If user exists, we'll get a specific error about invalid credentials
      // If user doesn't exist, we'll get a different error
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy_password_that_should_fail_123!'
      });
      
      console.log('SignupForm: Sign-in attempt result:', { data, error });
      
      if (error) {
        // Parse the error message to determine if user exists
        const errorMessage = error.message.toLowerCase();
        
        // These error messages indicate the user exists but password is wrong
        const userExistsErrors = [
          'invalid login credentials',
          'invalid password',
          'wrong password',
          'incorrect password',
          'authentication failed',
          'invalid email or password',
          'invalid credentials'
        ];
        
        // These error messages indicate the user doesn't exist
        const userNotExistsErrors = [
          'user not found',
          'email not confirmed',
          'no user found',
          'user does not exist'
        ];
        
        console.log('SignupForm: Error message analysis:', errorMessage);
        
        // Check if it's a "user exists" error
        if (userExistsErrors.some(err => errorMessage.includes(err))) {
          console.log('SignupForm: User exists - detected from error message');
          return true;
        }
        
        // Check if it's a "user doesn't exist" error  
        if (userNotExistsErrors.some(err => errorMessage.includes(err))) {
          console.log('SignupForm: User does not exist - detected from error message');
          return false;
        }
        
        // For any other error, assume user doesn't exist to be safe
        console.log('SignupForm: Unknown error type, assuming user does not exist');
        return false;
      }
      
      // If no error (successful login), user definitely exists
      if (data.user) {
        console.log('SignupForm: User exists - successful login detected');
        // Sign them out immediately since this was just a check
        await supabase.auth.signOut();
        return true;
      }
      
      // Default case - assume user doesn't exist
      console.log('SignupForm: Default case - assuming user does not exist');
      return false;
      
    } catch (error) {
      console.error('SignupForm: Error checking if user exists:', error);
      // On any exception, assume user doesn't exist to allow signup attempt
      return false;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowExistingUserError(false);
    
    if (!validateInputs()) {
      return;
    }
    
    try {
      setSigningUp(true);
      console.log('SignupForm: Starting registration process for:', email);
      
      // First check if user already exists
      const userExists = await checkIfUserExists(email);
      console.log('SignupForm: User exists check result:', userExists);
      
      if (userExists) {
        console.log('SignupForm: User already exists, showing error');
        setShowExistingUserError(true);
        toast.error('המשתמש כבר קיים במערכת');
        return;
      }
      
      console.log('SignupForm: User does not exist, proceeding with registration');
      
      // Clear any previous registration data
      clearRegistrationData();
      sessionStorage.removeItem('registration_data');
      
      // Save registration data to session storage and unified hook
      const registrationData = {
        email,
        password,
        userData: {
          firstName,
          lastName,
          phone
        },
        registrationTime: new Date().toISOString()
      };
      
      // Store in session storage
      sessionStorage.setItem('registration_data', JSON.stringify(registrationData));
      
      // Update unified registration data and start the flow
      updateRegistrationData(registrationData);
      startRegistering();
      
      console.log('SignupForm: Registration data saved, navigating to subscription page');
      toast.success('הפרטים נשמרו בהצלחה - אנא בחר תכנית מנוי');
      
      // Navigate to subscription page to start the flow
      navigate('/subscription', { replace: true });
      
      if (onSignupSuccess) {
        onSignupSuccess();
      }
    } catch (error: any) {
      console.error('SignupForm: Signup error:', error);
      
      // Check if it's a user already exists error (backup check)
      if (error.message?.includes('User already registered') || 
          error.message?.includes('already exists') ||
          error.message?.includes('user_repeated_signup')) {
        console.log('SignupForm: User exists error caught in backup check');
        setShowExistingUserError(true);
        toast.error('המשתמש כבר קיים במערכת');
      } else {
        toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה');
      }
    } finally {
      setSigningUp(false);
    }
  };

  const handleLoginRedirect = () => {
    // Switch to login tab
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('tab', 'login');
    navigate(currentUrl.pathname + currentUrl.search, { replace: true });
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
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                המשתמש עם כתובת המייל הזו כבר רשום במערכת.
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal underline mr-1"
                  onClick={handleLoginRedirect}
                >
                  לחץ כאן להתחברות
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last-name">שם משפחה</Label>
              <Input 
                id="last-name" 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={errors.lastName ? "border-red-500" : ""}
                required
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-name">שם פרטי</Label>
              <Input 
                id="first-name" 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={errors.firstName ? "border-red-500" : ""}
                required
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signup-email">דוא"ל</Label>
            <Input 
              id="signup-email" 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? "border-red-500" : ""}
              required
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <Input 
              id="phone" 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signup-password">סיסמה</Label>
            <Input 
              id="signup-password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password-confirm">אימות סיסמה</Label>
            <Input 
              id="password-confirm" 
              type="password" 
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className={errors.passwordConfirm ? "border-red-500" : ""}
            />
            {errors.passwordConfirm && <p className="text-xs text-red-500">{errors.passwordConfirm}</p>}
          </div>
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
