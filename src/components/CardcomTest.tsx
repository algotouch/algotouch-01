import { useState, useCallback } from 'react'
import { CardcomService } from '../services/cardcom'

interface PaymentResponse {
  response?: {
    Url?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export function CardcomTest() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PaymentResponse | null>(null)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)

  const testSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setIframeUrl(null)
      
      const response = await CardcomService.createPayment({
        amount: 0, // Zero price for subscription setup
        customerEmail: 'test@example.com',
        customerName: 'Test Customer',
        description: 'Subscription Setup',
        isSubscription: true,
        tokenization: true
      })

      setResult(response)
      
      // If we have a URL in the response, set it for the iframe
      if (response.response?.Url) {
        setIframeUrl(response.response.Url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cardcom Subscription Test</h1>
      
      <button
        onClick={testSubscription}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Setup Subscription (0 ILS)'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {iframeUrl && (
        <div className="mt-4">
          <h2 className="font-bold mb-2">Payment Form:</h2>
          <iframe
            src={iframeUrl}
            className="w-full h-[600px] border-0 rounded-lg shadow-lg"
            title="Cardcom Payment Form"
          />
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <h2 className="font-bold mb-2">Payment Response:</h2>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 