import { create } from 'zustand'

interface User {
  id: string
  username: string
  display_name: string
  avatar_url: string
}

interface StoreState {
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  showAuthModal: boolean
  setShowAuthModal: (show: boolean) => void
}

export const useStore = create<StoreState>((set) => ({
  isMuted: true, // Auto-play videos must start muted usually
  setIsMuted: (isMuted) => set({ isMuted }),
  currentUser: null,
  setCurrentUser: (currentUser) => set({ currentUser }),
  showAuthModal: false,
  setShowAuthModal: (showAuthModal) => set({ showAuthModal })
}))
