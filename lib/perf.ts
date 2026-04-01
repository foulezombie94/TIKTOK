/**
 * Client-Side Performance Monitoring — Pilier 4: Observabilité (v2 - Hardcore)
 * 
 * - requestIdleCallback instead of setInterval (no UI jank on mobile)
 * - SSR-safe: only initializes via initPerfMonitor() call in useEffect
 * - Hard memory limit (max 500 metrics to prevent OOM)
 * - Core Web Vitals tracking
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  tags?: Record<string, string>
  timestamp: number
}

const MAX_QUEUED_METRICS = 500
const BATCH_SIZE = 20
const FLUSH_INTERVAL_MS = 30_000

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private flushTimerId: number | null = null
  private destroyed = false

  /**
   * Initialize the monitor. Call this in a useEffect on the client only.
   */
  init() {
    if (typeof window === 'undefined' || this.destroyed) return
    this.initWebVitals()
    this.scheduleFlush()
    
    // Flush on page hide (user leaving)
    window.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * Record a custom metric
   */
  record(name: string, value: number, unit: string, tags?: Record<string, string>) {
    if (this.destroyed) return
    
    // Hard memory limit: drop oldest if too many queued
    if (this.metrics.length >= MAX_QUEUED_METRICS) {
      this.metrics = this.metrics.slice(-Math.floor(MAX_QUEUED_METRICS / 2))
    }

    this.metrics.push({ name, value, unit, tags, timestamp: Date.now() })

    if (this.metrics.length >= BATCH_SIZE) {
      this.flush()
    }
  }

  /**
   * Measure the duration of an operation
   */
  startTimer(name: string, tags?: Record<string, string>): () => void {
    const start = performance.now()
    return () => {
      const duration = Math.round(performance.now() - start)
      this.record(name, duration, 'ms', tags)
    }
  }

  // === Video metrics ===
  trackVideoLoad(videoId: string, loadTimeMs: number) {
    this.record('video.load_time', loadTimeMs, 'ms', { videoId: videoId.slice(0, 8) })
  }

  trackVideoBuffering(videoId: string, bufferTimeMs: number) {
    this.record('video.buffer_time', bufferTimeMs, 'ms', { videoId: videoId.slice(0, 8) })
  }

  trackVideoPlayStart(videoId: string, timeToPlayMs: number) {
    this.record('video.time_to_play', timeToPlayMs, 'ms', { videoId: videoId.slice(0, 8) })
  }

  // === Feed metrics ===
  trackFeedLoad(pageNumber: number, loadTimeMs: number, videoCount: number) {
    this.record('feed.load_time', loadTimeMs, 'ms', { 
      page: pageNumber.toString(), count: videoCount.toString() 
    })
  }

  // === API metrics ===
  trackApiCall(endpoint: string, durationMs: number, status: number) {
    this.record('api.response_time', durationMs, 'ms', { 
      endpoint, status: status.toString() 
    })
  }

  // === Core Web Vitals ===
  private initWebVitals() {
    if (typeof PerformanceObserver === 'undefined') return

    // LCP
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (last) this.record('web_vital.lcp', Math.round(last.startTime), 'ms')
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}

    // FID
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEventTiming
          this.record('web_vital.fid', Math.round(e.processingStart - e.startTime), 'ms')
        }
      }).observe({ type: 'first-input', buffered: true })
    } catch {}

    // CLS
    let clsValue = 0
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        this.record('web_vital.cls', Math.round(clsValue * 1000) / 1000, 'score')
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {}
  }

  // === Flush & scheduling ===

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') this.flush()
  }

  /**
   * Uses requestIdleCallback when available (no UI jank on TikTok scroll).
   * Falls back to setTimeout for Safari.
   */
  private scheduleFlush() {
    if (this.destroyed) return

    const scheduleNext = () => {
      if (this.destroyed) return
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          this.flush()
          // Schedule next flush using setTimeout for the interval
          this.flushTimerId = window.setTimeout(scheduleNext, FLUSH_INTERVAL_MS)
        }, { timeout: FLUSH_INTERVAL_MS + 5000 })
      } else {
        // Safari fallback
        this.flushTimerId = window.setTimeout(() => {
          this.flush()
          scheduleNext()
        }, FLUSH_INTERVAL_MS)
      }
    }

    scheduleNext()
  }

  private async flush() {
    if (this.metrics.length === 0) return

    const batch = this.metrics.splice(0, BATCH_SIZE)

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: batch }),
        keepalive: true,
      })
    } catch {
      // On failure: re-queue ONLY if under memory limit
      if (this.metrics.length + batch.length <= MAX_QUEUED_METRICS) {
        this.metrics.unshift(...batch)
      }
      // Otherwise: silently drop to prevent OOM
    }
  }

  destroy() {
    this.destroyed = true
    if (this.flushTimerId !== null) {
      clearTimeout(this.flushTimerId)
      this.flushTimerId = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
    this.flush() // Final flush
  }
}

// === Singleton (lazy initialization for SSR safety) ===
let _instance: PerformanceMonitor | null = null

/**
 * Get the performance monitor instance.
 * Returns null on the server. Call initPerfMonitor() in a useEffect first.
 */
export function getPerfMonitor(): PerformanceMonitor | null {
  return _instance
}

/**
 * Initialize the performance monitor. SSR-safe: call this in a useEffect.
 * Returns a cleanup function.
 * 
 * @example
 * useEffect(() => {
 *   const cleanup = initPerfMonitor()
 *   return cleanup
 * }, [])
 */
export function initPerfMonitor(): () => void {
  if (typeof window === 'undefined') return () => {}
  
  if (!_instance) {
    _instance = new PerformanceMonitor()
    _instance.init()
  }

  return () => {
    if (_instance) {
      _instance.destroy()
      _instance = null
    }
  }
}
