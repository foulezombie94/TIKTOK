/**
 * Error Boundary Component — Pilier 4: Observabilité (v2 - Hardcore)
 * 
 * - Retry counter (max 3 attempts, then redirect to home)
 * - Cache clearing on retry (flush InMemoryCache)
 * - Error reporting to /api/metrics
 * - Graceful fallback UI
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  maxRetries?: number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  retryCount: number
}

const MAX_RETRIES_DEFAULT = 3

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return { hasError: true, error, errorId }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Structured error report
    const report = {
      level: 'error',
      msg: 'React Error Boundary caught an error',
      timestamp: new Date().toISOString(),
      service: 'tiktok-clone',
      region: typeof process !== 'undefined' ? (process.env?.VERCEL_REGION || 'local') : 'client',
      error: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      errorId: this.state.errorId,
      retryCount: this.state.retryCount,
    }

    console.error(JSON.stringify(report))

    // Report to server (fire-and-forget)
    try {
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [{
            name: 'error.react_boundary',
            value: 1,
            unit: 'count',
            tags: {
              errorId: this.state.errorId || 'unknown',
              message: error.message.slice(0, 200),
              retryCount: this.state.retryCount.toString(),
            },
            timestamp: Date.now(),
          }]
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {}

    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1
    const maxRetries = this.props.maxRetries ?? MAX_RETRIES_DEFAULT

    // Clear caches to avoid stale-data errors
    try {
      // Dynamic import to avoid bundling cache in client unnecessarily
      import('@/lib/cache').then(({ videoCache, userCache, feedCache, counterCache }) => {
        videoCache.flush()
        userCache.flush()
        feedCache.flush()
        counterCache.flush()
      }).catch(() => {})
    } catch {}

    if (newRetryCount >= maxRetries) {
      // Too many retries — hard reload to clear everything
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
      return
    }

    this.setState({ hasError: false, error: null, errorId: null, retryCount: newRetryCount })
  }

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const maxRetries = this.props.maxRetries ?? MAX_RETRIES_DEFAULT
      const canRetry = this.state.retryCount < maxRetries

      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-black text-white p-6">
          <div className="w-16 h-16 rounded-full bg-tiktok-pink/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-tiktok-pink" />
          </div>
          <h2 className="text-lg font-bold mb-2">Quelque chose s&apos;est mal passé</h2>
          <p className="text-sm text-zinc-400 text-center mb-1 max-w-xs">
            {canRetry
              ? 'Une erreur inattendue est survenue. Nous en avons été informés.'
              : 'L\'erreur persiste après plusieurs tentatives.'}
          </p>
          {this.state.errorId && (
            <p className="text-[10px] text-zinc-600 font-mono mb-2">
              ID: {this.state.errorId}
            </p>
          )}
          {this.state.retryCount > 0 && (
            <p className="text-[10px] text-zinc-500 mb-4">
              Tentative {this.state.retryCount}/{maxRetries}
            </p>
          )}
          <div className="flex gap-3">
            {canRetry ? (
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 bg-tiktok-pink text-white px-6 py-2.5 rounded-full font-semibold text-sm active:scale-95 transition-transform"
              >
                <RefreshCcw className="w-4 h-4" />
                Réessayer
              </button>
            ) : (
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 bg-tiktok-pink text-white px-6 py-2.5 rounded-full font-semibold text-sm active:scale-95 transition-transform"
              >
                <Home className="w-4 h-4" />
                Retourner à l&apos;accueil
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
