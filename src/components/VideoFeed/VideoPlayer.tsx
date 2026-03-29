'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { useStore } from '@/store/useStore'
import { Volume2, VolumeX, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface VideoPlayerProps {
  video: {
    id: string
    video_url: string
    user_id: string
  }
  isActive: boolean
}

export default function VideoPlayer({ video, isActive }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const lastTapRef = useRef<number>(0)
  const heartIdRef = useRef(0)
  const isMuted = useStore((s) => s.isMuted)
  const setIsMuted = useStore((s) => s.setIsMuted)
  const currentUser = useStore((s) => s.currentUser)
  const setShowAuthModal = useStore((s) => s.setShowAuthModal)

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.6,
  })

  // Combine refs
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      inViewRef(node)
    },
    [inViewRef]
  )

  // Auto play/pause based on visibility
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return

    if (isActive && inView) {
      vid.play().catch(() => {})
      setIsPaused(false)
    } else {
      vid.pause()
    }
  }, [isActive, inView])

  // Handle mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  // Handle tap to pause/play
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current
    lastTapRef.current = now

    // Double tap = like
    if (timeSinceLastTap < 300) {
      handleDoubleTap(e)
      return
    }

    // Single tap (after delay to check for double)
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 280) {
        const vid = videoRef.current
        if (!vid) return
        if (vid.paused) {
          vid.play().catch(() => {})
          setIsPaused(false)
        } else {
          vid.pause()
          setIsPaused(true)
        }
      }
    }, 300)
  }

  // Double-tap like with heart animation
  const handleDoubleTap = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newHeart = { id: heartIdRef.current++, x, y }
    setHearts((prev) => [...prev, newHeart])

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id))
    }, 1000)

    // Like the video in DB
    if (!currentUser) {
      setShowAuthModal(true)
      return
    }

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('video_id', video.id)
        .maybeSingle()

      if (!existingLike) {
        await supabase.from('likes').insert({
          user_id: currentUser.id,
          video_id: video.id,
        })
      }
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  return (
    <div ref={setRefs} className="relative w-full h-full bg-black" onClick={handleTap}>
      <video
        ref={videoRef}
        src={video.video_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        poster=""
      />

      {/* Pause overlay icon */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.7, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Play className="w-20 h-20 text-white/80 fill-white/80" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-tap hearts */}
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0, y: -80 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute pointer-events-none z-40"
            style={{ left: heart.x - 30, top: heart.y - 30 }}
          >
            <Heart className="w-[60px] h-[60px] text-tiktok-pink fill-tiktok-pink drop-shadow-lg" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Mute button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsMuted(!isMuted)
        }}
        className="absolute top-16 right-4 z-30 p-2 rounded-full bg-black/30 backdrop-blur-sm"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-white" />
        ) : (
          <Volume2 className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  )
}
