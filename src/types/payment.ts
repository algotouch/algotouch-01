
export interface TokenData {
  token?: string | number;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  cardType?: string;
  approvalNumber?: string | number;
  [key: string]: string | number | boolean | null | undefined; // Index signature for Json compatibility
}

export interface PaymentError extends Error {
  code?: string;
  details?: any;
}

export interface PaymentSession {
  id: string;
  user_id?: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  id: string;
  user_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: any;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentToken {
  id: string;
  user_id: string;
  token: string;
  token_expiry: string;
  card_brand?: string;
  card_last_four?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  trialDays: number;
  billingCycle: 'monthly' | 'annual' | 'one-time';
  currency?: string;
}

export interface RegistrationData {
  email: string;
  password?: string;
  planId: string;
  userData?: {
    firstName: string;
    lastName: string;
    phone?: string;
    fullName?: string;
    email?: string;
    idNumber?: string;
  };
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractDetails?: ContractSignatureData;
  registrationTime?: string;
  paymentToken?: {
    token?: string;
    expiry?: string;
    last4Digits?: string;
    cardholderName?: string;
  };
}

export interface ContractSignatureData {
  contractHtml?: string;
  signature?: string;
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
  contractVersion?: string;
  browserInfo?: {
    userAgent?: string;
    language?: string;
    platform?: string;
    timeZone?: string;
  };
}

export interface CardcomPayload {
  ResponseCode: number;
  Description: string;
  LowProfileId: string;
  TranzactionId?: number;
  ReturnValue?: string;
  [key: string]: any;
}

export interface CardcomVerifyResponse {
  success: boolean;
  message?: string;
  error?: any;
  registrationId?: string;
  [key: string]: any;
}

export interface CardcomWebhookPayload {
  ResponseCode: number;
  Description: string;
  LowProfileId: string;
  TranzactionId?: number;
  ReturnValue?: string;
  [key: string]: any;
}
