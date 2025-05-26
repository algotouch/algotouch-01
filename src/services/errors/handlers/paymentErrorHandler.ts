
import { supabase } from '@/lib/supabase';

export interface PaymentErrorData {
  errorCode: string;
  errorMessage: string;
  userId?: string;
  paymentDetails?: any;
  timestamp: string;
  context: string;
}

class PaymentErrorHandler {
  async logError(errorData: PaymentErrorData): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_errors')
        .insert({
          error_code: errorData.errorCode,
          error_message: errorData.errorMessage,
          user_id: errorData.userId,
          request_data: errorData.paymentDetails || {},
          created_at: errorData.timestamp
        });

      if (error) {
        console.error('Failed to log payment error:', error);
      }
    } catch (error) {
      console.error('Error in payment error handler:', error);
    }
  }

  async getRecoveryInfo(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'initiated')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error getting recovery info:', error);
      return null;
    }
  }
}

export const paymentErrorHandler = new PaymentErrorHandler();
