
import { Session, User } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  error: Error | null;
  registrationData: RegistrationData | null;
  isRegistering: boolean;
  pendingSubscription: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ success: boolean; error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<any>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: any }>;
  setRegistrationData: (data: Partial<RegistrationData>) => void;
  clearRegistrationData: () => void;
  setPendingSubscription: (value: boolean) => void;
  validateSession: () => Promise<boolean>;
}

export interface RegistrationData {
  email?: string;
  password?: string;
  contractSigned?: boolean;
  planId?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  contractDetails?: {
    contractHtml?: string;
    signature?: string;
    agreedToTerms?: boolean;
    agreedToPrivacy?: boolean;
    contractVersion?: string;
    browserInfo?: any;
  };
  contractSignedAt?: string;
  registrationTime?: string;
  paymentToken?: {
    token?: string;
    expiry?: string;
    last4Digits?: string;
    cardholderName?: string;
  };
  isValid?: boolean;
}
