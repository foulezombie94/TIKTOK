'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import VideoPlayer from '@/components/VideoFeed/VideoPlayer'
import SidebarActions from '@/components/VideoFeed/SidebarActions'
import VideoOverlay from '@/components/VideoFeed/VideoOverlay'
import CommentSheet from '@/components/Comments/CommentSheet'
import { useStore } from '@/store/useStore'

interface Video {
  id: string
  user_id: string
  video_url: string
  caption: string
  music_name: string
  views_count: number
  created_at: string
  users: {
    id: string
    username: string
    display_name: string
    avatar_url: string
  }
  likes: { count: number }[]
  comments: { count: number }[]
  bookmarks: { count: number }[]
}

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [commentVideoId, setCommentVideoId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentUser = useStore((s) => s.currentUser)

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        users (id, username, display_name, avatar_url),
        likes (count),
        comments (count),
        bookmarks (count)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      setVideos(data as unknown as Video[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  // Handle scroll snap
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const scrollTop = container.scrollTop
    const height = container.clientHeight
    const idx = Math.round(scrollTop / height)
    if (idx !== activeIndex) {
      setActiveIndex(idx)
    }
  }, [activeIndex])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tiktok-pink border-t-transparent rounded-full animate-spin" />
          <p className="text-tiktok-gray text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="text-6xl">🎬</div>
          <h2 className="text-xl font-semibold">Aucune vidéo pour le moment</h2>
          <p className="text-tiktok-gray text-sm">
            Soyez le premier à publier une vidéo !
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center pt-3 pb-2 pointer-events-none">
        <div className="flex items-center gap-6">
          <span className="text-white/60 text-[15px] font-medium cursor-pointer pointer-events-auto">Abonnements</span>
          <span className="text-white text-[15px] font-bold border-b-2 border-white pb-0.5 pointer-events-auto cursor-pointer">Pour toi</span>
        </div>
      </div>

      {/* Video feed */}
      <div
        ref={containerRef}
        className="snap-container scrollbar-hide"
      >
        {videos.map((video, index) => (
          <div key={video.id} className="snap-item relative">
            <VideoPlayer
              video={video}
              isActive={index === activeIndex}
            />
            <VideoOverlay video={video} />
            <SidebarActions
              video={video}
              onCommentClick={() => setCommentVideoId(video.id)}
              currentUserId={currentUser?.id || null}
            />
          </div>
        ))}
      </div>

      {/* Comment sheet */}
      {commentVideoId && (
        <CommentSheet
          videoId={commentVideoId}
          onClose={() => setCommentVideoId(null)}
        />
      )}
    </>
  )
}
