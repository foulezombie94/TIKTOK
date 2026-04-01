'use client'

import { motion } from 'framer-motion'
import { ShieldAlert, Globe, Monitor, Mail } from 'lucide-react'

export default function BannedDevicePage() {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black overflow-hidden px-8">
      {/* Red Pulse Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-red-600/20 blur-[150px] rounded-full animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-[450px] flex flex-col items-center text-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-red-600/10 border border-red-600/20 flex items-center justify-center mb-8">
          <ShieldAlert className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-3xl font-black mb-4 tracking-tight text-white uppercase">Accès Appareil Révoqué</h1>
        <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
          Cet appareil et votre réseau ont été identifiés comme ayant enfreint nos conditions d&apos;utilisation.
          L&apos;accès à TikTok Clone est désormais impossible sur ce poste.
        </p>

        <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8 backdrop-blur-sm">
           <div className="flex flex-col gap-4 text-left">
              <div className="flex items-center gap-4 text-zinc-500">
                 <Globe className="w-5 h-5" />
                 <span className="text-sm font-medium">Bannissement Réseau (IP)</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-500">
                 <Monitor className="w-5 h-5" />
                 <span className="text-sm font-medium">Bannissement Matériel (Fingerprint)</span>
              </div>
           </div>
        </div>

        <div className="flex flex-col items-center gap-4">
           <p className="text-zinc-600 text-xs uppercase tracking-widest font-bold">Signalement d&apos;erreur ?</p>
           <a 
             href="mailto:support@tiktokclone.com"
             className="flex items-center gap-2 text-white font-bold hover:text-red-500 transition-colors"
           >
             <Mail className="w-4 h-4" />
             Contacter la conciergerie
           </a>
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-[10px] text-zinc-800 uppercase tracking-widest font-black">
        Protocol NOC-SECURE v4 / ID: 0x8842-FIREWALL
      </div>
    </div>
  )
}
