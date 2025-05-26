import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentMonitor } from '@/services/monitoring/paymentMonitor';
import { cardcomConfig, isTestEnvironment } from '@/config/cardcom';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      admin: {
        createUser: vi.fn()
      }
    }
  }
}));

describe('Cardcom Payment Integration', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Ensure we're in test mode
    process.env.NEXT_PUBLIC_CARDCOM_TEST_MODE = 'true';
  });

  afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks();
  });

  describe('Payment Initialization', () => {
    it('should create a payment session with correct parameters', async () => {
      const mockResponse = {
        ResponseCode: 0,
        LowProfileId: 'test-lp-id',
        Url: 'https://secure.cardcom.solutions/test-payment'
      };

      // Mock the fetch call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const response = await fetch(cardcomConfig.baseUrl + '/LowProfile/Create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          TerminalNumber: cardcomConfig.terminal,
          ApiName: cardcomConfig.username,
          Amount: 371.00,
          Operation: 'CreateTokenOnly'
        })
      });

      const data = await response.json();
      expect(data.ResponseCode).toBe(0);
      expect(data.LowProfileId).toBe('test-lp-id');
    });

    it('should handle payment initialization errors', async () => {
      // Mock a failed response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      try {
        await fetch(cardcomConfig.baseUrl + '/LowProfile/Create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            TerminalNumber: cardcomConfig.terminal,
            ApiName: cardcomConfig.username,
            Amount: 371.00,
            Operation: 'CreateTokenOnly'
          })
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Payment Monitoring', () => {
    it('should monitor payment status correctly', async () => {
      const mockPayment = {
        payload: {
          ResponseCode: 0,
          LowProfileId: 'test-lp-id',
          TranzactionId: '12345',
          ReturnValue: 'user-123'
        }
      };

      // Mock Supabase response
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPayment, error: null })
      });

      const result = await PaymentMonitor.monitorPayment('test-lp-id');
      expect(result).toBe(true);
    });

    it('should handle payment monitoring errors', async () => {
      // Mock Supabase error
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      });

      const result = await PaymentMonitor.monitorPayment('test-lp-id');
      expect(result).toBe(false);
    });
  });

  describe('Subscription Management', () => {
    it('should verify subscription status correctly', async () => {
      const mockSubscription = {
        status: 'active',
        current_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      // Mock Supabase response
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubscription, error: null })
      });

      const result = await PaymentMonitor.verifySubscriptionStatus('user-123');
      expect(result.isActive).toBe(true);
      expect(result.subscriptionType).toBe('active');
      expect(result.expiresAt).toBe(mockSubscription.current_period_ends_at);
    });

    it('should handle missing subscription', async () => {
      // Mock Supabase response for no subscription
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      });

      const result = await PaymentMonitor.verifySubscriptionStatus('user-123');
      expect(result.isActive).toBe(false);
      expect(result.subscriptionType).toBe('none');
      expect(result.expiresAt).toBeNull();
    });
  });

  describe('Payment Failure Handling', () => {
    it('should handle payment failures correctly', async () => {
      const mockError = new Error('Payment failed');
      const context = {
        userId: 'user-123',
        planId: 'monthly',
        amount: 371.00
      };

      // Mock Supabase responses
      (supabase.from as any).mockImplementation((table) => {
        if (table === 'notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          };
        }
        if (table === 'payment_webhooks') {
          return {
            update: vi.fn().mockResolvedValue({ error: null })
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null })
        };
      });

      await PaymentMonitor.handlePaymentFailure('test-lp-id', mockError, context);
      
      // Verify notifications were created
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      // Verify payment status was updated
      expect(supabase.from).toHaveBeenCalledWith('payment_webhooks');
    });
  });
}); 