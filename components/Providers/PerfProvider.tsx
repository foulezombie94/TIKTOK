/**
 * Performance Monitoring Provider — SSR-safe initialization
 * 
 * Initializes the perf monitor in a useEffect (client-only).
 * Ensures no SSR hydration mismatch.
 */

'use client'

import { useEffect } from 'react'
import { initPerfMonitor } from '@/lib/perf'

export default function PerfProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const cleanup = initPerfMonitor()
    return cleanup
  }, [])

  return <>{children}</>
}
