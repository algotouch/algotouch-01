
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase-client';

// The index page redirects to the auth page
const Index = () => {
  // Clear any stale registration data when landing on the index page
  useEffect(() => {
    // Log supabase client configuration for debugging
    console.log('Supabase client initialized');
    
    // Check if Supabase connection is working
    const checkSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
          console.error('Supabase connection test failed:', error);
          // Store the error for the error page
          localStorage.setItem('auth_error', `Supabase connection failed: ${error.message}`);
        } else {
          console.log('Supabase connection test successful');
        }
      } catch (err: any) {
        console.error('Error testing Supabase connection:', err);
        localStorage.setItem('auth_error', `Supabase connection error: ${err.message || String(err)}`);
      }
    };
    
    checkSupabaseConnection();
    
    // If there's stale registration data, clear it
    const registrationData = sessionStorage.getItem('registration_data');
    if (registrationData) {
      sessionStorage.removeItem('registration_data');
    }
    
    // Also clear any session data that might be causing problems
    try {
      // Extract project ref from the Supabase URL
      const supabaseUrl = "https://ndhakvhrrkczgylcmyoc.supabase.co"; // Using the direct URL instead of getUrl()
      const projectRef = supabaseUrl.split('//')[1].split('.')[0];
      const sessionKey = `sb-${projectRef}-auth-token`;
      
      if (localStorage.getItem(sessionKey)) {
        console.log('Found existing Supabase session in localStorage');
      }
    } catch (err) {
      console.error('Error checking Supabase session:', err);
    }
  }, []);
  
  // Make sure the redirection works properly
  return <Navigate to="/auth" replace />;
};

export default Index;
