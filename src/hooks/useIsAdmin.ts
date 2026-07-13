import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setIsAdmin(false); setLoading(false); return }
    supabase
      .from('gisele_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsAdmin(data?.role === 'admin')
        setLoading(false)
      })
  }, [user, authLoading])

  return { isAdmin, loading: loading || authLoading }
}
