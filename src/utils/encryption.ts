import CryptoJS from 'crypto-js';

// Use environment variables for encryption keys
const ENCRYPTION_KEYS = {
  current: process.env.REACT_APP_ENCRYPTION_KEY || '',
  previous: process.env.REACT_APP_PREVIOUS_ENCRYPTION_KEY || ''
};

// Validate encryption keys
if (!ENCRYPTION_KEYS.current) {
  console.error('Encryption key not found in environment variables');
}

export const encrypt = (data: string): string => {
  try {
    if (!data) return '';
    
    // Add timestamp to detect key rotation
    const payload = {
      data,
      timestamp: Date.now()
    };
    
    return CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      ENCRYPTION_KEYS.current
    ).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return '';
  }
};

export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) return '';
  
  try {
    // Try current key first
    let decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEYS.current);
    let result = decrypted.toString(CryptoJS.enc.Utf8);
    
    // If decryption fails, try previous key
    if (!result && ENCRYPTION_KEYS.previous) {
      decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEYS.previous);
      result = decrypted.toString(CryptoJS.enc.Utf8);
    }
    
    if (!result) {
      throw new Error('Decryption failed with both keys');
    }
    
    // Parse the payload
    const payload = JSON.parse(result);
    
    // Check if data is too old (e.g., 30 days)
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    if (Date.now() - payload.timestamp > MAX_AGE) {
      console.warn('Decrypted data is older than 30 days');
    }
    
    return payload.data;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}; 