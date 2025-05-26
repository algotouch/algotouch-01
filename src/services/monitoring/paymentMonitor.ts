import { CardcomPayload, CardcomWebhookPayload } from '@/types/payment';
import { supabase } from '@/lib/supabase';

export class PaymentMonitor {
  private static readonly ALLOWED_CHARS = /^[a-zA-Z0-9-_]+$/;
  private static readonly MAX_IDENTIFIER_LENGTH = 100;
  private static readonly MAX_SOURCE_LENGTH = 50;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

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

  private static async logPaymentEvent(
    level: 'info' | 'warn' | 'error',
    message: string,
    source: string,
    data: any = {},
    userId?: string | number,
    transactionId?: string
  ) {
    try {
      const sanitizedSource = this.sanitizeIdentifier(source.slice(0, this.MAX_SOURCE_LENGTH));
      
      await supabase.from('payment_logs').insert({
        level,
        message,
        source: sanitizedSource,
        data,
        user_id: userId?.toString(),
        transaction_id: transactionId,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log payment event:', error);
    }
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

  static async monitorPayment(paymentId: string, maxRetries: number = this.MAX_RETRIES): Promise<boolean> {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const { data: payment, error } = await supabase
          .from('payment_webhooks')
          .select('*')
          .eq('payload->LowProfileId', paymentId)
          .single();

        if (error) {
          throw error;
        }

        if (!payment) {
          await this.logPaymentEvent(
            'warn',
            `Payment not found: ${paymentId}`,
            'payment-monitor',
            { paymentId }
          );
          return false;
        }

        const payload = payment.payload as CardcomPayload;
        
        if (payload.ResponseCode === 0) {
          await this.logPaymentEvent(
            'info',
            `Payment successful: ${paymentId}`,
            'payment-monitor',
            { paymentId, payload },
            payload.ReturnValue,
            payload.TranzactionId?.toString()
          );
          return true;
        } else {
          await this.logPaymentEvent(
            'error',
            `Payment failed: ${paymentId}`,
            'payment-monitor',
            { 
              paymentId, 
              payload,
              error: payload.Description || 'Unknown error'
            },
            payload.ReturnValue,
            payload.TranzactionId?.toString()
          );
          return false;
        }
      } catch (error) {
        retryCount++;
        await this.logPaymentEvent(
          'error',
          `Payment monitoring error (attempt ${retryCount}/${maxRetries})`,
          'payment-monitor',
          { 
            paymentId,
            error: error instanceof Error ? error.message : String(error),
            retryCount
          }
        );

        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * Math.pow(2, retryCount)));
        }
      }
    }

    return false;
  }

  static async verifySubscriptionStatus(userId: string): Promise<{
    isActive: boolean;
    subscriptionType: string;
    expiresAt: string | null;
  }> {
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      if (!subscription) {
        await this.logPaymentEvent(
          'warn',
          `No subscription found for user: ${userId}`,
          'subscription-monitor',
          { userId }
        );
        return {
          isActive: false,
          subscriptionType: 'none',
          expiresAt: null
        };
      }

      const isActive = subscription.status === 'active' || subscription.status === 'trial';
      const expiresAt = subscription.current_period_ends_at;

      await this.logPaymentEvent(
        'info',
        `Subscription status checked for user: ${userId}`,
        'subscription-monitor',
        { 
          userId,
          status: subscription.status,
          isActive,
          expiresAt
        }
      );

      return {
        isActive,
        subscriptionType: subscription.status,
        expiresAt
      };
    } catch (error) {
      await this.logPaymentEvent(
        'error',
        `Error checking subscription status`,
        'subscription-monitor',
        { 
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      );
      throw error;
    }
  }

  static async handlePaymentFailure(
    paymentId: string,
    error: any,
    context: {
      userId?: string;
      planId?: string;
      amount?: number;
    } = {}
  ): Promise<void> {
    try {
      // Log the failure
      await this.logPaymentEvent(
        'error',
        `Payment failed: ${paymentId}`,
        'payment-failure-handler',
        {
          paymentId,
          error: error instanceof Error ? error.message : String(error),
          ...context
        },
        context.userId
      );

      // Notify user if we have their ID
      if (context.userId) {
        await supabase.from('notifications').insert({
          user_id: context.userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again or contact support.',
          data: {
            paymentId,
            planId: context.planId,
            amount: context.amount
          }
        });
      }

      // Update payment status in database
      await supabase
        .from('payment_webhooks')
        .update({
          processed: true,
          processing_result: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          }
        })
        .eq('payload->LowProfileId', paymentId);
    } catch (logError) {
      console.error('Error handling payment failure:', logError);
    }
  }
}
