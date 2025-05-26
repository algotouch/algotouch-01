import { supabase } from '@/integrations/supabase/client';
import { ErrorTrackingData } from '../types/errorTypes';

/**
 * Logs an error to the system logs table in Supabase
 */
export const logError = async (data: ErrorTrackingData): Promise<void> => {
  try {
    const { category, action, error, userId, metadata } = data;
    
    // Extract meaningful error information
    const errorMessage = error?.message || 'Unknown error';
    const errorStack = error?.stack;
    const errorCode = error?.code || 'UNKNOWN';
    
    // Structured error details
    const errorDetails = {
      message: errorMessage,
      stack: errorStack,
      code: errorCode,
      metadata,
      userId,
      action,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      }
    };
    
    // Log to console for development
    console.error(`[${category}] Error in ${action}:`, errorDetails);
    
    // Log to Supabase
    const { error: dbError } = await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        function_name: `${category}.${action}`,
        message: errorMessage,
        details: errorDetails
      });
      
    if (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  } catch (loggingError) {
    // Fail silently but log to console
    console.error('Error during error logging:', loggingError);
  }
};

/**
 * Creates a structured app error
 */
export const createAppError = (options: {
  message: string;
  userMessage?: string;
  category: string;
  code: string;
  recoverable?: boolean;
  retryable?: boolean;
  details?: Record<string, any>;
}): Error => {
  const error = new Error(options.message);
  
  // Add custom properties
  Object.assign(error, {
    userMessage: options.userMessage || options.message,
    category: options.category,
    code: options.code,
    recoverable: options.recoverable ?? false,
    retryable: options.retryable ?? false,
    details: options.details
  });
  
  return error;
};

class ErrorTracking {
  private errors: Array<{
    id: string;
    timestamp: string;
    error: any;
    context: string;
  }> = [];

  trackError(error: any, context: string = 'unknown'): string {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    this.errors.push({
      id: errorId,
      timestamp: new Date().toISOString(),
      error: this.sanitizeError(error),
      context
    });

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    console.error(`[${errorId}] Error in ${context}:`, error);
    return errorId;
  }

  getError(errorId: string) {
    return this.errors.find(e => e.id === errorId);
  }

  getRecentErrors(count: number = 10) {
    return this.errors.slice(-count);
  }

  private sanitizeError(error: any): any {
    if (!error) return error;
    
    const sanitized = { ...error };
    
    // Remove sensitive information
    delete sanitized.token;
    delete sanitized.cardNumber;
    delete sanitized.cvv;
    delete sanitized.password;
    
    return sanitized;
  }
}

export const errorTracking = new ErrorTracking();
