'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Mail, ArrowLeft, LogOut, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

export default function BannedPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || "Veuillez contacter le support pour plus d'informations."

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black text-white p-6 overflow-hidden font-manrope">
      {/* Red Glitch Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-rose-900/30 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-red-600/10 blur-[150px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      {/* Main Content Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-[480px] bg-zinc-900/40 border border-rose-500/30 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl text-center"
      >
        <div className="flex justify-center mb-10">
          <motion.div 
            animate={{ 
               scale: [1, 1.1, 1],
               rotate: [0, 5, -5, 0]
            }}
            transition={{ 
               duration: 2,
               repeat: Infinity,
               ease: "easeInOut"
            }}
            className="p-6 bg-rose-500/10 rounded-full"
          >
            <ShieldAlert className="w-20 h-20 text-rose-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          </motion.div>
        </div>

        <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase text-rose-400">Accès Révoqué</h1>
        <p className="text-zinc-400 text-sm font-medium mb-12 leading-relaxed">
          Votre compte a été <span className="text-rose-500 font-bold">Banni</span> du TikTok Clone Cluster suite à une violation de nos conditions d&apos;utilisation.
        </p>

        {/* Ban Details Box */}
        <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-6 mb-12 text-left space-y-4">
           <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-300/60">
              <Info className="w-3 h-3" />
              Détails du Bannissement
           </div>
           <p className="text-rose-100/80 text-[13px] leading-relaxed italic font-medium">
             &ldquo;{reason}&rdquo;
           </p>
        </div>

        {/* Actions */}
        <div className="space-y-4 w-full">
           <button 
             onClick={() => window.location.href = 'mailto:support@tiktok-cockpit.com'}
             className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group shadow-lg shadow-rose-900/20"
           >
              <Mail className="w-5 h-5" />
              Contacter le Support
           </button>
           
           <button 
             onClick={handleLogout}
             className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
           >
              <LogOut className="w-5 h-5" />
              Déconnexion
           </button>
        </div>

        <div className="mt-12 text-[10px] uppercase font-black tracking-widest text-zinc-600">
           Digital Curator Engine v1.4.0 — NOC Enforcement Active
        </div>
      </motion.div>

      {/* Retro-cyberpunk footer overlay */}
      <div className="absolute bottom-8 left-8">
         <div className="flex items-center gap-2 text-[10px] font-mono text-rose-500/30">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            SEC_ERROR_USER_BANNED
         </div>
      </div>
    </div>
  )
}
