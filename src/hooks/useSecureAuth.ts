
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Session, User } from '@supabase/supabase-js';

export function useSecureAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isAuthenticated = !!session && !!user;

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            console.log('Auth state changed:', event, !!currentSession);
            if (mounted) {
              setSession(currentSession);
              setUser(currentSession?.user || null);
              if (event === 'SIGNED_OUT') {
                setError(null);
              }
            }
          }
        );
        
        authSubscription = subscription;

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError && mounted) {
          console.error('Session error:', sessionError);
          setError(sessionError);
        }

        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user || null);
          setLoading(false);
          setInitialized(true);
          console.log('Auth initialized successfully');
        }
      } catch (err) {
        if (mounted) {
          console.error('Auth initialization error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
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
      console.error('Sign in error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      setError(null);
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
      console.error('Sign up error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(signOutError);
      }
    } catch (err) {
      console.error('Sign out error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    }
  };

  const updateProfile = async (userData: any) => {
    try {
      setError(null);
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: userData
      });

      if (updateError) {
        setError(updateError);
        return { success: false, error: updateError };
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Update profile error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
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
      console.error('Reset password error:', err);
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { success: false, error };
    }
  };

  return {
    session,
    user,
    loading,
    isAuthenticated,
    initialized,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };
}
