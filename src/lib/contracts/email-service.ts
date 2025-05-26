
import { supabase } from '@/lib/supabase';

class EmailService {
  async sendContractConfirmation(email: string, contractId: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-contract-email', {
        body: {
          email,
          contractId,
          type: 'confirmation'
        }
      });

      if (error) {
        console.error('Error sending contract confirmation email:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send contract confirmation:', error);
      throw error;
    }
  }

  async sendContractCopy(email: string, contractHtml: string): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-contract-email', {
        body: {
          email,
          contractHtml,
          type: 'copy'
        }
      });

      if (error) {
        console.error('Error sending contract copy:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to send contract copy:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
