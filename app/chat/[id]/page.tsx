'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import ChatBox from '@/components/Chat/ChatBox'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { id } = useParams()
  const router = useRouter()
  const currentUser = useStore((s: any) => s.currentUser)
  const isAuthLoading = useStore((s: any) => s.isAuthLoading)
  const [recipient, setRecipient] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchChatContext = useCallback(async () => {
    if (!currentUser) return

    // Verify conversation and get recipient
    const { data: conv, error } = await supabase
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', id)
      .single()

    if (error || !conv) {
      toast.error('Conversation introuvable')
      router.push('/inbox')
      return
    }

    const recipientId = conv.participant_1 === currentUser.id ? conv.participant_2 : conv.participant_1

    const { data: user } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', recipientId)
      .single()

    if (user) setRecipient(user)
    setLoading(false)
  }, [id, currentUser, router])

  useEffect(() => {
    if (isAuthLoading) return
    if (!currentUser) {
       router.push('/')
       return
    }
    fetchChatContext()
  }, [isAuthLoading, currentUser, fetchChatContext, router])

  if (loading || isAuthLoading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-tiktok-pink" />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] w-full max-w-[500px] mx-auto bg-black">
      <ChatBox 
        conversationId={id as string} 
        currentUser={currentUser} 
        recipient={recipient} 
      />
    </div>
  )
}
