'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { Loader2, Music2, Apple, Mail, User, Lock, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        toast.success('Bon retour !')
      } else {
        if (!username) {
          toast.error("Le nom d'utilisateur est requis")
          setLoading(false)
          return
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.toLowerCase(),
              full_name: username,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            },
          },
        })
        if (error) throw error
        toast.success('Compte créé ! Bienvenue sur TikTok.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black overflow-hidden">
      {/* Premium Background Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-tiktok-pink/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-tiktok-cyan/20 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[400px] px-8 flex flex-col items-center"
      >
        <div className="mb-10 text-center">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center mb-6"
          >
             <div className="relative">
                <Music2 className="w-16 h-16 text-white drop-shadow-[2px_2px_0_#FE2C55] drop-shadow-[-2px_-2px_0_#25F4EE]" />
             </div>
          </motion.div>
          <h1 className="text-3xl font-black mb-2 tracking-tight">TikTok Clone</h1>
          <p className="text-zinc-500 text-sm">Préparez-vous à être inspiré.</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.form 
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            onSubmit={handleAuth} 
            className="w-full flex flex-col gap-4"
          >
            {!isLogin && (
               <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-tiktok-pink transition-colors" />
                  <input
                    type="text"
                    placeholder="Nom d'utilisateur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                    className="w-full rounded-xl bg-zinc-900/50 border border-zinc-800 px-12 py-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-tiktok-pink transition-all backdrop-blur-sm"
                    required
                  />
               </div>
            )}

            <div className="relative group">
               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-tiktok-pink transition-colors" />
               <input
                 type="email"
                 placeholder="Adresse e-mail"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full rounded-xl bg-zinc-900/50 border border-zinc-800 px-12 py-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-tiktok-pink transition-all backdrop-blur-sm"
                 required
               />
            </div>

            <div className="relative group">
               <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-tiktok-pink transition-colors" />
               <input
                 type="password"
                 placeholder="Mot de passe"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full rounded-xl bg-zinc-900/50 border border-zinc-800 px-12 py-4 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-tiktok-pink transition-all backdrop-blur-sm"
                 required
               />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black py-4 font-bold text-base transition-all hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Se connecter' : "S'inscrire"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        <div className="mt-8 flex flex-col items-center gap-6 w-full">
           <div className="flex items-center gap-4 w-full">
              <div className="h-[1px] flex-1 bg-zinc-800" />
              <span className="text-zinc-600 text-xs font-medium uppercase tracking-widest">Ou continuer avec</span>
              <div className="h-[1px] flex-1 bg-zinc-800" />
           </div>

           <div className="flex gap-4 w-full">
              <button className="flex-1 flex items-center justify-center py-3 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors">
                <Apple className="w-5 h-5 text-white" />
              </button>
              <button className="flex-1 flex items-center justify-center py-3 border border-zinc-800 rounded-xl hover:bg-zinc-900 transition-colors">
                <div className="w-5 h-5 bg-[#4285F4] rounded-sm flex items-center justify-center">
                   <span className="text-[10px] font-bold text-white">G</span>
                </div>
              </button>
           </div>
        </div>

        <p className="mt-12 text-sm text-zinc-500">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 font-bold text-white hover:underline"
          >
            {isLogin ? "Créez-en un" : 'Connectez-vous'}
          </button>
        </p>
      </motion.div>

      {/* Footer legal */}
      <div className="absolute bottom-8 text-[11px] text-zinc-700 max-w-[300px] text-center">
         En continuant, vous acceptez nos Conditions d&apos;utilisation et reconnaissez avoir lu notre Politique de confidentialité.
      </div>
    </div>
  )
}
