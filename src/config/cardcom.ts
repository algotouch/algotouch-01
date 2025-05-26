interface CardcomConfig {
  terminal: string;
  username: string;
  password: string;
  baseUrl: string;
  webhookUrl: string;
  successUrl: string;
  errorUrl: string;
  isTestMode: boolean;
}

const TEST_CONFIG: CardcomConfig = {
  terminal: process.env.NEXT_PUBLIC_CARDCOM_TEST_TERMINAL || '',
  username: process.env.NEXT_PUBLIC_CARDCOM_TEST_USERNAME || '',
  password: process.env.NEXT_PUBLIC_CARDCOM_TEST_PASSWORD || '',
  baseUrl: 'https://secure.cardcom.solutions/api/v11',
  webhookUrl: process.env.NEXT_PUBLIC_CARDCOM_TEST_WEBHOOK_URL || '',
  successUrl: process.env.NEXT_PUBLIC_CARDCOM_TEST_SUCCESS_URL || '',
  errorUrl: process.env.NEXT_PUBLIC_CARDCOM_TEST_ERROR_URL || '',
  isTestMode: true
};

const PROD_CONFIG: CardcomConfig = {
  terminal: process.env.NEXT_PUBLIC_CARDCOM_TERMINAL || '',
  username: process.env.NEXT_PUBLIC_CARDCOM_USERNAME || '',
  password: process.env.NEXT_PUBLIC_CARDCOM_PASSWORD || '',
  baseUrl: 'https://secure.cardcom.solutions/api/v11',
  webhookUrl: process.env.NEXT_PUBLIC_CARDCOM_WEBHOOK_URL || '',
  successUrl: process.env.NEXT_PUBLIC_CARDCOM_SUCCESS_URL || '',
  errorUrl: process.env.NEXT_PUBLIC_CARDCOM_ERROR_URL || '',
  isTestMode: false
};

// Determine which configuration to use based on environment
const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_CARDCOM_TEST_MODE === 'true';

export const cardcomConfig: CardcomConfig = isTestMode ? TEST_CONFIG : PROD_CONFIG;

// Validate configuration
function validateConfig(config: CardcomConfig): void {
  const requiredFields: (keyof CardcomConfig)[] = [
    'terminal',
    'username',
    'password',
    'webhookUrl',
    'successUrl',
    'errorUrl'
  ];

  const missingFields = requiredFields.filter(field => !config[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required Cardcom configuration fields: ${missingFields.join(', ')}`
    );
  }
}

// Validate the active configuration
validateConfig(cardcomConfig);

// Export helper functions
export const isTestEnvironment = () => cardcomConfig.isTestMode;

export const getCardcomApiUrl = (endpoint: string) => 
  `${cardcomConfig.baseUrl}/${endpoint}`;

export const getCardcomHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Cardcom-Environment': isTestEnvironment() ? 'test' : 'production'
}); 