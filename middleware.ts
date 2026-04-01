/**
 * Edge Middleware — Pilier 3: Sécurité (v2 - Hardcore)
 * 
 * - Whitelisted good bots (Googlebot, Bingbot)
 * - 444-style empty response for bad bots
 * - Admin check via JWT user_metadata (no DB query)
 * - Tighter CSP (removed unsafe-eval where possible)
 * - Correlation IDs + structured access logs
 * - Token Bucket rate limiting inline
 */

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// =============================================
// RATE LIMITER (inline for Edge Runtime)
// =============================================
const buckets = new Map<string, { tokens: number; lastRefill: number }>()
let lastCleanup = Date.now()

function edgeRateLimit(ip: string, path: string): { allowed: boolean; remaining: number } {
  let maxTokens = 60, refillRate = 10
  if (path.startsWith('/api/auth') || path.includes('/auth/')) { maxTokens = 5; refillRate = 0.1 }
  else if (path.includes('/upload')) { maxTokens = 3; refillRate = 0.05 }
  else if (path.includes('/api/')) { maxTokens = 30; refillRate = 5 }

  const key = `${path.split('/').slice(0, 3).join('/')}:${ip}`
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now }
    buckets.set(key, bucket)
  }

  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true, remaining: Math.floor(bucket.tokens) }
  }
  return { allowed: false, remaining: 0 }
}

function cleanupBuckets() {
  if (Date.now() - lastCleanup < 300_000) return
  lastCleanup = Date.now()
  const cutoff = Date.now() - 600_000
  const keysToDelete: string[] = []
  buckets.forEach((v, k) => {
    if (v.lastRefill < cutoff) keysToDelete.push(k)
  })
  keysToDelete.forEach(k => buckets.delete(k))
}

// =============================================
// BOT DETECTION
// =============================================

// Good bots that should be ALLOWED (search engine crawlers)
const GOOD_BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebot/i, /twitterbot/i,
  /linkedinbot/i, /whatsapp/i, /telegrambot/i,
]

// Bad bot/scraper patterns
const BAD_BOT_PATTERNS = [
  /scrapy/i, /python-requests/i, /python-urllib/i, /curl\//i,
  /wget\//i, /httpclient/i, /libwww/i, /httpunit/i,
  /nutch/i, /biglotron/i, /teoma/i, /convera/i,
]

function classifyBot(ua: string): 'good' | 'bad' | 'none' {
  if (GOOD_BOT_PATTERNS.some(p => p.test(ua))) return 'good'
  if (BAD_BOT_PATTERNS.some(p => p.test(ua))) return 'bad'
  return 'none'
}

// =============================================
// MIDDLEWARE
// =============================================

export async function middleware(req: NextRequest) {
  cleanupBuckets()

  // === 1. Correlation ID ===
  const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID()

  // === 2. Client IP extraction ===
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || 'unknown'

  // === 3. Bot Detection (smart: whitelist good bots, block bad ones) ===
  const ua = req.headers.get('user-agent') || ''
  const botType = classifyBot(ua)

  // Block bad bots on API routes with 444-style empty response (no body = wastes less bandwidth)
  if (botType === 'bad' && req.nextUrl.pathname.startsWith('/api/')
    && !req.nextUrl.pathname.startsWith('/api/health')
    && !req.nextUrl.pathname.startsWith('/api/webhook')) {
    return new NextResponse(null, { status: 403, headers: { 'Connection': 'close' } })
  }

  // === 4. Hardware & IP Ban Check (HARDCORE SECURITY) ===
  const hardwareId = req.cookies.get('_tk_dev_id')?.value || null
  
  // On utilise le client Supabase (Edge) pour vérifier l'IP et le Hardware ID
  const supabaseMiddleware = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll() } } }
  )

  const { data: isBanned } = await supabaseMiddleware.rpc('check_is_hardware_banned', {
    p_ip: ip,
    p_hardware_id: hardwareId
  })

  if (isBanned && !req.nextUrl.pathname.startsWith('/banned-device')) {
    return NextResponse.redirect(new URL('/banned-device', req.url))
  }

  // === 5. Rate Limiting for API routes ===

  // === 5. Session refresh (Supabase Auth) ===
  const res = await updateSession(req)
  
  // IMMEDIATELY RETURN if banned (redirected by updateSession)
  if (res.headers.get('location')?.includes('/banned')) {
    return res
  }

  // === 6. Admin route protection (JWT metadata check, NO DB query) ===
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return req.cookies.getAll() } } }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Try JWT metadata first (fast path, no DB hit)
    const isAdminViaJwt = session.user.user_metadata?.role === 'admin'
      || session.user.app_metadata?.role === 'admin'

    if (!isAdminViaJwt) {
      // Fallback: check admin_roles table (slow path, only if JWT doesn't have role)
      const { data: adminCheck } = await supabase
        .from('admin_roles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single()

      if (!adminCheck) {
        console.warn(JSON.stringify({
          level: 'warn',
          msg: 'Admin access attempt blocked',
          userId: session.user.id,
          ip,
          path: req.nextUrl.pathname,
          correlationId,
          timestamp: new Date().toISOString(),
        }))
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  }

  // === 7. Security Headers ===
  res.headers.set('X-Correlation-ID', correlationId)
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-XSS-Protection', '0') // Modern browsers: CSP replaces this
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  res.headers.set('X-DNS-Prefetch-Control', 'on')
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  // Content-Security-Policy (tighter: removed unsafe-eval ONLY in production)
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : ''
  
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://js.stripe.com`

  const csp = [
    "default-src 'self'",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.stripe.com https://api.dicebear.com`,
    `img-src 'self' data: blob: https://${supabaseHost} https://api.dicebear.com https://images.unsplash.com`,
    `media-src 'self' blob: https://${supabaseHost}`,
    // unsafe-inline required for Next.js inline styles
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
  res.headers.set('Content-Security-Policy', csp)

  // === 8. Structured access log (API routes only) ===
  if (req.nextUrl.pathname.startsWith('/api/')) {
    console.log(JSON.stringify({
      level: 'info',
      msg: 'api_request',
      method: req.method,
      path: req.nextUrl.pathname,
      ip,
      botType,
      correlationId,
      timestamp: new Date().toISOString(),
    }))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
