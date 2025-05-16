
import { createContext } from 'react';
import { AuthContextType } from './types';

// Create context with a default value that doesn't cause errors
// This prevents issues when accessing context before provider is mounted
const defaultValue: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  initialized: false,
  error: null,
  signIn: async () => { throw new Error('AuthContext not initialized') },
  signUp: async () => { throw new Error('AuthContext not initialized') },
  signOut: async () => { throw new Error('AuthContext not initialized') },
  updateProfile: async () => { throw new Error('AuthContext not initialized') },
  resetPassword: async () => { throw new Error('AuthContext not initialized') }
};

export const AuthContext = createContext<AuthContextType>(defaultValue);
