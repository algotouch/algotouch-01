
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Session, User, AuthError } from '@supabase/supabase-js';

export function useSecureAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isAuthenticated = !!session && !!user;

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // First set up auth subscription to detect changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, currentSession) => {
            if (mounted) {
              setSession(currentSession);
              setUser(currentSession?.user || null);
            }
          }
        );

        // Then check current session
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
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Authentication methods
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
      console.error('Sign in error:', err);
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
      console.error('Sign up error:', err);
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
      console.error('Sign out error:', err);
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
      console.error('Update profile error:', err);
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
