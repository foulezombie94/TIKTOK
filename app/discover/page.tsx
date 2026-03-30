'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserItem {
  id: string
  username: string
  display_name: string
  avatar_url: string
}

export default function DiscoverPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const fetchResults = async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) {
      setResults([])
      setIsSearching(false)
      return
    }

    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${searchQuery}%`)
      .limit(10)

    if (data) setResults(data)
    setIsSearching(false)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (val.trim().length === 0) {
      setResults([])
      setIsSearching(false)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      return
    }

    setIsSearching(true)

    // Clear previous timeout (Debounce)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    
    // Set new timeout (300ms) to prevent DDoS
    debounceTimer.current = setTimeout(() => {
      fetchResults(val)
    }, 300)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return (
    <div className="bg-black min-h-[100dvh] pt-12 pb-[80px]">
      <div className="px-4 mb-6 sticky top-0 bg-black pt-4 pb-2 z-10 border-b border-zinc-900">
         <h1 className="text-xl font-bold mb-4">Découverte</h1>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
               type="text" 
               placeholder="Rechercher des utilisateurs..."
               value={query}
               onChange={handleSearch}
               className="w-full bg-[#1e1e1e] text-white pl-10 pr-4 py-3 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-700"
            />
         </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
         {results.map(user => (
            <div 
               key={user.id} 
               onClick={() => router.push(`/profile/${user.username}`)}
               className="flex items-center gap-3 cursor-pointer py-2 hover:bg-zinc-900/50 rounded-lg transition px-2"
            >
               <img src={user.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt="avatar" className="w-12 h-12 rounded-full border border-zinc-800 object-cover" />
               <div className="flex-1">
                  <h3 className="font-semibold text-[15px]">{user.username}</h3>
                  <p className="text-zinc-500 text-sm">{user.display_name || user.username}</p>
               </div>
            </div>
         ))}

         {query.length > 0 && results.length === 0 && !isSearching && (
            <div className="text-center text-zinc-500 py-10 text-sm">
               Aucun utilisateur trouvé pour &quot;{query}&quot;
            </div>
         )}
         
         {query.length === 0 && (
            <div className="text-center text-zinc-600 py-10 flex flex-col justify-center items-center">
               <Search className="w-10 h-10 mb-3 opacity-30" />
               <p className="text-sm">Recherchez un ami ou un créateur</p>
            </div>
         )}
      </div>
    </div>
  )
}
