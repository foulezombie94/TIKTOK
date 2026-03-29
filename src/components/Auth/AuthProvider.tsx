'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setCurrentUser = useStore((s) => s.setCurrentUser)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Fetch user from public.users table
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
           setCurrentUser(userData)
        }
      } else {
        setCurrentUser(null)
      }
    })

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
           setCurrentUser(userData)
        }
      } else {
        setCurrentUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setCurrentUser])

  return <>{children}</>
}
