'use client'

import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setCurrentUser = useStore((s: any) => s.setCurrentUser)
  const setIsAuthLoading = useStore((s: any) => s.setIsAuthLoading)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userData) {
        setCurrentUser(userData)
      } else {
        setTimeout(async () => {
           const { data: retryData } = await supabase.from('users').select('*').eq('id', userId).single()
           if (retryData) setCurrentUser(retryData)
        }, 1500)
      }

      // Initialisation des compteurs d'inbox (Bootup)
      const [notifRes, msgRes] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', userId).eq('is_read', false)
      ])

      const { setUnreadNotificationsCount, setUnreadMessagesCount } = useStore.getState() as any
      setUnreadNotificationsCount(notifRes.count || 0)
      setUnreadMessagesCount(msgRes.count || 0)

    } catch (err) {
      console.error("Auth Error:", err)
    } finally {
      setIsAuthLoading(false)
    }
  }, [setCurrentUser, setIsAuthLoading])

  useEffect(() => {
    // Phase 1 : Charger la session initiale
    const initAuth = async () => {
      setIsAuthLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setIsAuthLoading(false)
      }
    }
    
    initAuth()

    // Phase 2 : Écouter les changements d'état (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setIsAuthLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile, setCurrentUser, setIsAuthLoading])

  return <>{children}</>
}
