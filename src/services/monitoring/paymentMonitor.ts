
import { CardcomPayload, CardcomWebhookPayload } from '@/types/payment';

export class PaymentMonitor {
  static startTracking(identifier: string) {
    console.log(`[PaymentMonitor] Starting tracking for: ${identifier}`);
    return {
      endTracking: () => {
        console.log(`[PaymentMonitor] Ending tracking for: ${identifier}`);
      }
    };
  }

  static logVerificationAttempt(identifier: string, source: string) {
    console.log(`[PaymentMonitor] Verification attempt - ${identifier} from ${source}`);
  }

  static logVerificationSuccess(identifier: string, source: string, data: any, registrationId?: string) {
    console.log(`[PaymentMonitor] Verification success - ${identifier} from ${source}`, { data, registrationId });
  }

  static logVerificationFailure(identifier: string, source: string, error: any, registrationId?: string) {
    console.error("[PaymentMonitor] Verification failure - %s from %s", identifier, source, { error, registrationId });
  }
}
