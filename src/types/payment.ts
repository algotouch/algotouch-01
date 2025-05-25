
export interface TokenData {
  token?: string | number;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
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
