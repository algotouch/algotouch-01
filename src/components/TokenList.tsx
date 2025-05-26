import { useEffect, useState } from 'react'
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

export function TokenList() {
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('payments')
          .select('*')
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

    fetchTokens()
  }, [])

  if (loading) return <div>Loading tokens...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Payment Tokens</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Customer</th>
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
                <td className="px-4 py-2">
                  <div>{token.customer_name}</div>
                  <div className="text-sm text-gray-500">{token.customer_email}</div>
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
    </div>
  )
} 