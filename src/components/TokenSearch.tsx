import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface TokenInfo {
  id: string
  created_at: string
  transaction_id: string
  customer_email: string
  customer_name: string
  cardcom_response: {
    Token: string
    TokenExpiration: string
    ApprovalNumber: string
    CardNumber: string
    CardExpiration: string
    TransactionId: string
    OperationType: string
  }
  status: string
}

export function TokenSearch() {
  const [email, setEmail] = useState('')
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTokens = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_email', email)
        .not('cardcom_response->Token', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTokens(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Search Tokens by Email</h1>
      
      <div className="flex gap-2 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter customer email"
          className="flex-1 px-4 py-2 border rounded"
        />
        <button
          onClick={searchTokens}
          disabled={loading || !email}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {tokens.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Token</th>
                <th className="px-4 py-2">Expiration</th>
                <th className="px-4 py-2">Card</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id} className="border-t">
                  <td className="px-4 py-2">
                    {new Date(token.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-sm">
                    {token.cardcom_response?.Token}
                  </td>
                  <td className="px-4 py-2">
                    {token.cardcom_response?.TokenExpiration}
                  </td>
                  <td className="px-4 py-2">
                    {token.cardcom_response?.CardNumber}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded ${
                      token.status === 'approved' ? 'bg-green-100 text-green-800' :
                      token.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {token.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-sm">
                    {token.transaction_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && email && (
          <div className="text-center text-gray-500">
            No tokens found for this email
          </div>
        )
      )}
    </div>
  )
} 