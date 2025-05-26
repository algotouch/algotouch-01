
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  error: Error | null;
  registrationData: any | null;
  isRegistering: boolean;
  pendingSubscription: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: any }>;
  setRegistrationData: (data: any) => void;
  clearRegistrationData: () => void;
  setPendingSubscription: (value: boolean) => void;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [registrationData, setRegistrationData] = useState<any | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pendingSubscription, setPendingSubscription] = useState(false);
  const navigate = useNavigate();
  
  const isAuthenticated = !!session && !!user;

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Set up auth subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (mounted) {
              setSession(currentSession);
              setUser(currentSession?.user || null);
            }
          }
        );

        // Get current session
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError && mounted) {
          setError(sessionError);
        }

        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user || null);
          setLoading(false);
          setInitialized(true);
        }

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (err) {
        if (mounted) {
          console.error('Auth initialization error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Load registration data from sessionStorage
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const data = JSON.parse(storedData);
        const registrationTime = data.registrationTime ? new Date(data.registrationTime) : null;
        const now = new Date();
        const isValid = registrationTime && 
          ((now.getTime() - registrationTime.getTime()) < 2 * 60 * 60 * 1000);
        
        if (isValid) {
          setRegistrationData({ ...data, isValid });
          setIsRegistering(true);
          setPendingSubscription(true);
        } else {
          sessionStorage.removeItem('registration_data');
        }
      }
    } catch (error) {
      console.error("Error parsing registration data:", error);
      sessionStorage.removeItem('registration_data');
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError);
        return { success: false, error: signInError };
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (signUpError) {
        setError(signUpError);
        return { success: false, error: signUpError };
      }

      return { success: true, user: data.user };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const signOut = async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  };

  const updateProfile = async (userData: any) => {
    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: userData
      });

      if (updateError) {
        setError(updateError);
        return { success: false, error: updateError };
      }

      return { success: true, user: data.user };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (resetError) {
        setError(resetError);
        return { success: false, error: resetError };
      }

      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const updateRegistrationData = (data: any) => {
    const updatedData = {
      ...(registrationData || {}),
      ...data,
      registrationTime: data.registrationTime || new Date().toISOString()
    };
    
    setRegistrationData(updatedData);
    setIsRegistering(true);
    setPendingSubscription(true);
    
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
  };
  
  const clearRegistrationData = () => {
    sessionStorage.removeItem('registration_data');
    sessionStorage.removeItem('force_subscription_access');
    localStorage.removeItem('temp_registration_id');
    setRegistrationData(null);
    setIsRegistering(false);
    setPendingSubscription(false);
  };
  
  const validateSession = async () => {
    if (!session) return false;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Session validation error:', error);
        return false;
      }
      
      return !!data.user;
    } catch (error) {
      console.error('Session validation exception:', error);
      return false;
    }
  };

  // Show loading while auth is initializing
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAuthenticated,
      initialized,
      error,
      registrationData,
      isRegistering,
      pendingSubscription,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
      setRegistrationData: updateRegistrationData,
      clearRegistrationData,
      setPendingSubscription,
      validateSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
