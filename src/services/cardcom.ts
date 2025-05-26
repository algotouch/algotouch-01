import { supabase } from '../lib/supabase'

interface CardcomPaymentRequest {
  amount: number
  currency?: string
  customerEmail: string
  customerName: string
  description: string
  isSubscription?: boolean
  tokenization?: boolean
}

interface CardcomPaymentResponse {
  transactionId: string
  status: string
  response: any
}

export class CardcomService {
  private static readonly API_URL = 'https://secure.cardcom.solutions/Api/v11'
  private static readonly TERMINAL_NUMBER = process.env.VITE_CARDCOM_TERMINAL_NUMBER
  private static readonly USERNAME = process.env.VITE_CARDCOM_USERNAME
  private static readonly API_PASSWORD = process.env.VITE_CARDCOM_API_PASSWORD

  static async createPayment({
    amount,
    currency = 'ILS',
    customerEmail,
    customerName,
    description,
    isSubscription = false,
    tokenization = true
  }: CardcomPaymentRequest): Promise<CardcomPaymentResponse> {
    try {
      // Create payment record in Supabase
      const { data: payment, error: dbError } = await supabase
        .from('payments')
        .insert({
          amount,
          currency,
          customer_email: customerEmail,
          customer_name: customerName,
          description,
          status: 'pending',
          payment_method: isSubscription ? 'subscription' : 'one_time'
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Prepare Cardcom API request
      const requestData = {
        TerminalNumber: this.TERMINAL_NUMBER,
        UserName: this.USERNAME,
        APILevel: 11,
        Password: this.API_PASSWORD,
        Amount: amount,
        Currency: currency,
        Description: description,
        CustomerEmail: customerEmail,
        CustomerName: customerName,
        ReturnValue: payment.id,
        SuccessUrl: `${window.location.origin}/payment/success`,
        ErrorUrl: `${window.location.origin}/payment/error`,
        IndicatorUrl: `${window.location.origin}/api/payment/callback`,
        // Tokenization settings
        IsTokenization: tokenization,
        IsCreateToken: tokenization,
        // Subscription settings
        IsRecurring: isSubscription,
        RecurringAmount: isSubscription ? amount : undefined,
        RecurringPeriod: isSubscription ? 1 : undefined, // 1 = monthly
        RecurringPeriodType: isSubscription ? 1 : undefined, // 1 = monthly
        // Zero price setup for subscription
        IsZeroPriceSetup: isSubscription && amount === 0,
        // Additional settings for better UX
        ShowSuccessPage: true,
        ShowErrorPage: true,
        UseIframe: true, // Enable iframe mode
        IframeWidth: '100%',
        IframeHeight: '600px',
        // Additional customer details
        CustomerPhone: '',
        CustomerAddress: '',
        CustomerCity: '',
        CustomerZip: '',
        CustomerCountry: 'IL'
      }

      // Make request to Cardcom API
      const response = await fetch(`${this.API_URL}/CreateTransaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const cardcomResponse = await response.json()

      // Update payment record with Cardcom response
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          transaction_id: cardcomResponse.TransactionId,
          cardcom_response: cardcomResponse,
          status: cardcomResponse.Status
        })
        .eq('id', payment.id)

      if (updateError) throw updateError

      return {
        transactionId: cardcomResponse.TransactionId,
        status: cardcomResponse.Status,
        response: cardcomResponse
      }
    } catch (error) {
      console.error('Cardcom payment error:', error)
      throw error
    }
  }

  static async checkTransactionStatus(transactionId: string) {
    try {
      const requestData = {
        TerminalNumber: this.TERMINAL_NUMBER,
        UserName: this.USERNAME,
        APILevel: 11,
        Password: this.API_PASSWORD,
        TransactionId: transactionId
      }

      const response = await fetch(`${this.API_URL}/GetTransactionStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const statusResponse = await response.json()

      // Update payment status in Supabase
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: statusResponse.Status,
          cardcom_response: statusResponse
        })
        .eq('transaction_id', transactionId)

      if (updateError) throw updateError

      return statusResponse
    } catch (error) {
      console.error('Cardcom status check error:', error)
      throw error
    }
  }
} 