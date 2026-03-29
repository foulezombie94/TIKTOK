'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, PlusSquare, MessageSquare, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { icon: Home, label: 'Accueil', path: '/' },
    { icon: Compass, label: 'Découverte', path: '/discover' },
    { icon: PlusSquare, label: '', path: '/upload', isUpload: true },
    { icon: MessageSquare, label: 'Boîte', path: '/inbox' },
    { icon: User, label: 'Profil', path: '/profile/me' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10 safe-area-bottom w-full max-w-[500px] mx-auto">
      <div className="flex justify-between items-center h-[60px] px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/profile/me' && pathname?.startsWith('/profile'))
          const Icon = item.icon

          if (item.isUpload) {
            return (
              <Link key={item.path} href={item.path} className="flex flex-col items-center justify-center flex-1 py-2">
                 <div className="relative w-11 h-[28px] rounded-lg bg-white flex items-center justify-center 
                                 before:absolute before:content-[''] before:w-full before:h-full before:-left-[3px] before:rounded-lg before:bg-tiktok-cyan before:-z-10
                                 after:absolute after:content-[''] after:w-full after:h-full after:-right-[3px] after:rounded-lg after:bg-tiktok-pink after:-z-10">
                    <PlusSquare className="w-5 h-5 text-black" strokeWidth={2.5} />
                 </div>
              </Link>
            )
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 ${
                isActive ? 'text-white' : 'text-zinc-500'
              }`}
            >
              <Icon className="w-[26px] h-[26px]" fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium leading-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
