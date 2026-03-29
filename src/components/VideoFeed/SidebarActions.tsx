'use client'

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Bookmark, Share2, Plus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface SidebarActionsProps {
  video: {
    id: string
    user_id: string
    users: {
      avatar_url: string
    }
    likes: { count: number }[]
    comments: { count: number }[]
    bookmarks: { count: number }[]
  }
  onCommentClick: () => void
  currentUserId: string | null
}

export default function SidebarActions({ video, onCommentClick, currentUserId }: SidebarActionsProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(video.likes[0]?.count || 0)
  
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkCount, setBookmarkCount] = useState(video.bookmarks[0]?.count || 0)
  
  const [isFollowing, setIsFollowing] = useState(false)
  const showAuthModal = useStore(state => state.setShowAuthModal)

  const commentCount = video.comments[0]?.count || 0

  useEffect(() => {
    if (!currentUserId) return

    const checkLike = async () => {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('video_id', video.id)
        .eq('user_id', currentUserId)
        .single()
      if (data) setIsLiked(true)
    }

    const checkBookmark = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('video_id', video.id)
        .eq('user_id', currentUserId)
        .single()
      if (data) setIsBookmarked(true)
    }

    const checkFollow = async () => {
      if (video.user_id === currentUserId) {
         setIsFollowing(true);
         return;
      }
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', video.user_id)
        .eq('follower_id', currentUserId)
        .single()
      if (data) setIsFollowing(true)
    }

    checkLike()
    checkBookmark()
    checkFollow()
  }, [currentUserId, video.id, video.user_id])

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) {
      showAuthModal(true)
      return
    }

    const prevLiked = isLiked
    const prevCount = likeCount

    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)

    try {
      if (!isLiked) {
        await supabase.from('likes').insert({ video_id: video.id, user_id: currentUserId })
      } else {
        await supabase.from('likes').delete().eq('video_id', video.id).eq('user_id', currentUserId)
      }
    } catch {
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
      toast.error('Erreur lors du like')
    }
  }

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) {
      showAuthModal(true)
      return
    }

    const prevBookmarked = isBookmarked
    const prevCount = bookmarkCount

    setIsBookmarked(!isBookmarked)
    setBookmarkCount(isBookmarked ? bookmarkCount - 1 : bookmarkCount + 1)

    try {
      if (!isBookmarked) {
        await supabase.from('bookmarks').insert({ video_id: video.id, user_id: currentUserId })
      } else {
        await supabase.from('bookmarks').delete().eq('video_id', video.id).eq('user_id', currentUserId)
      }
    } catch {
      setIsBookmarked(prevBookmarked)
      setBookmarkCount(prevCount)
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUserId) {
      showAuthModal(true)
      return
    }

    setIsFollowing(true)
    try {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_id: video.user_id
      })
      toast.success('Abonné !')
    } catch {
      setIsFollowing(false)
      toast.error('Erreur lors de l\'abonnement')
    }
  }

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  return (
    <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-5">
      <div className="relative mb-2 shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <img 
          src={video.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
          alt="Avatar" 
          className="w-12 h-12 rounded-full border-[1.5px] border-white object-cover"
        />
        {!isFollowing && currentUserId !== video.user_id && (
          <button 
            onClick={handleFollow}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-tiktok-pink rounded-full p-0.5"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      <button 
        className="flex flex-col items-center gap-1 cursor-pointer" 
        onClick={handleLike}
      >
        <div className={`p-2 rounded-full ${isLiked ? 'text-tiktok-pink' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]'}`}>
          <Heart className="w-8 h-8 pointer-events-none transition-transform active:scale-75" fill={isLiked ? 'currentColor' : 'transparent'} />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          {formatCount(likeCount)}
        </span>
      </button>

      <button 
        className="flex flex-col items-center gap-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onCommentClick()
        }}
      >
        <div className="p-2 rounded-full text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
          <MessageCircle className="w-8 h-8 pointer-events-none transition-transform active:scale-75" fill="currentColor" stroke="none" />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          {formatCount(commentCount)}
        </span>
      </button>

      <button 
        className="flex flex-col items-center gap-1 cursor-pointer"
        onClick={handleBookmark}
      >
        <div className={`p-2 rounded-full ${isBookmarked ? 'text-tiktok-cyan' : 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]'}`}>
          <Bookmark className="w-8 h-8 pointer-events-none transition-transform active:scale-75" fill={isBookmarked ? 'currentColor' : 'transparent'} />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          {formatCount(bookmarkCount)}
        </span>
      </button>

      <button 
        className="flex flex-col items-center gap-1 cursor-pointer text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 rounded-full">
          <Share2 className="w-8 h-8 pointer-events-none transition-transform active:scale-75" fill="currentColor" stroke="none" />
        </div>
        <span className="text-white text-xs font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
          Partager
        </span>
      </button>
      
      <div className="mt-4 animate-spin-disc" onClick={(e) => e.stopPropagation()}>
         <div className="w-10 h-10 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center">
            <img src={video.users?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} className="w-5 h-5 rounded-full object-cover" />
         </div>
      </div>
    </div>
  )
}
