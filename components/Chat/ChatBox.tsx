'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, Loader2, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useStore } from '@/store/useStore'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  read?: boolean
}

interface ChatBoxProps {
  conversationId: string
  currentUser: any
  recipient: any
}

export default function ChatBox({ conversationId, currentUser, recipient }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { unreadMessagesCount, setUnreadMessagesCount } = useStore() as any

  const markMessagesAsRead = useCallback(async (msgList: Message[]) => {
    const unreadFromOthers = msgList.filter(m => m.sender_id !== currentUser.id && !m.read)
    if (unreadFromOthers.length > 0) {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .in('id', unreadFromOthers.map(m => m.id))
      
      if (!error) {
        setUnreadMessagesCount(Math.max(0, unreadMessagesCount - unreadFromOthers.length))
      }
    }
  }, [currentUser.id, unreadMessagesCount, setUnreadMessagesCount])

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      
      if (data) {
        setMessages(data)
        markMessagesAsRead(data)
      }
      setLoading(false)
      setTimeout(() => scrollToBottom(), 100)
    }

    fetchMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMessage = payload.new as Message
        setMessages(prev => [...prev, newMessage])
        
        // Si on est dans le chat, on marque comme lu immédiatement
        if (newMessage.sender_id !== currentUser.id) {
          supabase.from('messages').update({ read: true }).eq('id', newMessage.id)
        }
        
        setTimeout(() => scrollToBottom(), 50)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, markMessagesAsRead, currentUser.id])

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || sending) return

    setSending(true)
    const content = newComment.trim()
    setNewComment('')

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content
    })

    if (error) {
       setNewComment(content)
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-zinc-900 sticky top-0 bg-black/80 backdrop-blur z-10">
        <Link href="/inbox">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <img src={recipient.avatar_url} className="w-8 h-8 rounded-full object-cover" />
        <span className="font-bold">{recipient.display_name}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-tiktok-pink" /></div>
        ) : (
          messages.map((m) => (
            <div 
              key={m.id} 
              className={`flex flex-col ${m.sender_id === currentUser.id ? 'items-end' : 'items-start'}`}
            >
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                m.sender_id === currentUser.id 
                  ? 'bg-tiktok-pink text-white rounded-tr-none' 
                  : 'bg-zinc-800 text-white rounded-tl-none'
              }`}>
                {m.content}
              </div>
              <span className="text-[10px] text-zinc-600 mt-1">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-900 flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Envoyer un message..."
          className="flex-1 bg-zinc-900 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-tiktok-pink transition-all"
        />
        <button 
          disabled={!newComment.trim() || sending}
          className="w-12 h-12 bg-tiktok-pink rounded-full flex items-center justify-center disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  )
}
