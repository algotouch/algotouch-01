
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import { PostgrestError } from '@supabase/supabase-js'

interface DataItem {
  id: number
  created_at: string
  [key: string]: any
}

export function Example() {
  const [data, setData] = useState<DataItem[] | null>(null)
  const [error, setError] = useState<PostgrestError | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
      
      if (error) throw error
      setData(data)
    } catch (err) {
      setError(err as PostgrestError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchDataSafely = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('your_table')
          .select('*')
        
        if (error) throw error
        if (isMounted) {
          setData(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err as PostgrestError)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDataSafely()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return <div>No data found</div>

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Data</h1>
      <div className="bg-white shadow rounded-lg p-4">
        <pre className="whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}
