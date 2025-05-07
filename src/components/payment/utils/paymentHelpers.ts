
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

export const getSubscriptionPlans = (): Record<string, SubscriptionPlan> => {
  return {
    monthly: {
      id: 'monthly',
      name: 'חודשי',
      price: 371,
      currency: '₪',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      features: ['גישה מלאה לכל התכונות', 'ללא התחייבות', 'חודש ניסיון חינם'],
      trialDays: 30,
      billingCycle: 'monthly',
    },
    annual: {
      id: 'annual',
      name: 'שנתי',
      price: 3371,
      currency: '₪',
      description: '25% הנחה | שלושה חודשים מתנה',
      features: ['גישה מלאה לכל התכונות', 'חיסכון של 25%', 'חידוש שנתי'],
      trialDays: 0,
      billingCycle: 'annual',
    },
    vip: {
      id: 'vip',
      name: 'VIP',
      price: 13121,
      currency: '₪',
      description: 'גישה לכל החיים בתשלום חד פעמי',
      features: ['גישה לכל החיים', 'כל התכונות העתידיות', 'תמיכה VIP'],
      trialDays: 0,
      billingCycle: 'one-time',
    },
  };
};

// Updated TokenData interface with an index signature to make it compatible with Json type
export interface TokenData {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  [key: string]: string | number | boolean | null | TokenData[] | undefined; // Adding index signature for Json compatibility
}

export const createTokenData = (cardNumber: string, expiryDate: string, cardholderName: string): TokenData => {
  return {
    lastFourDigits: cardNumber.slice(-4),
    expiryMonth: expiryDate.split('/')[0],
    expiryYear: `20${expiryDate.split('/')[1]}`,
    cardholderName
  };
};
