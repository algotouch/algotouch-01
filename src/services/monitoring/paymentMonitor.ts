import { CardcomPayload, CardcomWebhookPayload } from '@/types/payment';

export class PaymentMonitor {
  private static readonly ALLOWED_CHARS = /^[a-zA-Z0-9-_]+$/;
  private static readonly MAX_IDENTIFIER_LENGTH = 100;
  private static readonly MAX_SOURCE_LENGTH = 50;

  private static sanitizeIdentifier(identifier: string): string {
    if (!identifier) return '';
    
    // Truncate if too long
    const truncated = identifier.slice(0, this.MAX_IDENTIFIER_LENGTH);
    
    // Remove any potentially dangerous characters
    const sanitized = truncated.replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Validate against allowed characters
    if (!this.ALLOWED_CHARS.test(sanitized)) {
      console.warn('Invalid identifier characters detected:', identifier);
      return '';
    }
    
    return sanitized;
  }

  private static sanitizeSource(source: string): string {
    if (!source) return '';
    
    // Truncate if too long
    const truncated = source.slice(0, this.MAX_SOURCE_LENGTH);
    
    // Remove any potentially dangerous characters
    const sanitized = truncated.replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Validate against allowed characters
    if (!this.ALLOWED_CHARS.test(sanitized)) {
      console.warn('Invalid source characters detected:', source);
      return '';
    }
    
    return sanitized;
  }

  static startTracking(identifier: string) {
    const safeIdentifier = this.sanitizeIdentifier(identifier);
    if (!safeIdentifier) {
      console.error('Invalid identifier provided for tracking');
      return {
        endTracking: () => {}
      };
    }

    console.log(`[PaymentMonitor] Starting tracking for: ${safeIdentifier}`);
    return {
      endTracking: () => {
        console.log(`[PaymentMonitor] Ending tracking for: ${safeIdentifier}`);
      }
    };
  }

  static logVerificationAttempt(identifier: string, source: string) {
    const safeIdentifier = this.sanitizeIdentifier(identifier);
    const safeSource = this.sanitizeSource(source);
    
    if (!safeIdentifier || !safeSource) {
      console.error('Invalid identifier or source provided for verification attempt');
      return;
    }

    console.log(`[PaymentMonitor] Verification attempt - ${safeIdentifier} from ${safeSource}`);
  }

  static logVerificationSuccess(identifier: string, source: string, data: any, registrationId?: string) {
    const safeIdentifier = this.sanitizeIdentifier(identifier);
    const safeSource = this.sanitizeSource(source);
    const safeRegistrationId = registrationId ? this.sanitizeIdentifier(registrationId) : undefined;
    
    if (!safeIdentifier || !safeSource) {
      console.error('Invalid identifier or source provided for verification success');
      return;
    }

    // Sanitize sensitive data
    const sanitizedData = this.sanitizeSensitiveData(data);
    console.log(`[PaymentMonitor] Verification success - ${safeIdentifier} from ${safeSource}`, { 
      data: sanitizedData, 
      registrationId: safeRegistrationId 
    });
  }

  static logVerificationFailure(identifier: string, source: string, error: any, registrationId?: string) {
    const safeIdentifier = this.sanitizeIdentifier(identifier);
    const safeSource = this.sanitizeSource(source);
    const safeRegistrationId = registrationId ? this.sanitizeIdentifier(registrationId) : undefined;
    
    if (!safeIdentifier || !safeSource) {
      console.error('Invalid identifier or source provided for verification failure');
      return;
    }

    // Sanitize error data
    const sanitizedError = this.sanitizeError(error);
    console.error(`[PaymentMonitor] Verification failure - ${safeIdentifier} from ${safeSource}`, { 
      error: sanitizedError, 
      registrationId: safeRegistrationId 
    });
  }

  private static sanitizeSensitiveData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove or mask sensitive fields
    if (sanitized.cardNumber) {
      sanitized.cardNumber = '****-****-****-' + sanitized.cardNumber.slice(-4);
    }
    if (sanitized.cvv) {
      sanitized.cvv = '***';
    }
    if (sanitized.expiryDate) {
      sanitized.expiryDate = '**/**';
    }
    if (sanitized.token) {
      sanitized.token = '****';
    }
    if (sanitized.password) {
      sanitized.password = '********';
    }
    if (sanitized.email) {
      sanitized.email = sanitized.email.replace(/(?<=.{3}).(?=.*@)/g, '*');
    }
    
    // Remove any remaining sensitive fields
    const sensitiveFields = [
      'secret',
      'key',
      'apiKey',
      'privateKey',
      'accessToken',
      'refreshToken'
    ];
    
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '****';
      }
    });
    
    return sanitized;
  }

  private static sanitizeError(error: any): any {
    if (!error) return error;
    
    // Create a sanitized copy
    const sanitized = { ...error };
    
    // Remove sensitive information
    delete sanitized.stack;
    delete sanitized.sensitive;
    delete sanitized.token;
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.password;
    delete sanitized.email;
    
    // Sanitize any nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    });
    
    return sanitized;
  }
}
