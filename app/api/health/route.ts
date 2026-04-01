/**
 * Health Check Endpoint — Pilier 4: Observabilité (v2 - Hardcore)
 * 
 * - Throttled Supabase checks (10s cache to prevent cascading failures)
 * - Edge-compatible uptime via module-level startTime
 * - Optional x-health-key authentication
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Edge-compatible uptime: declared at module load (instance deploy time)
const INSTANCE_START_TIME = Date.now()

// Throttled health check cache (prevents hammering Supabase)
let lastHealthCheck: { result: Record<string, any>; timestamp: number } | null = null
const HEALTH_CHECK_TTL_MS = 10_000 // 10 seconds

export async function GET(req: NextRequest) {
  const start = Date.now()

  // === Optional auth for health endpoint ===
  const healthKey = process.env.HEALTH_CHECK_KEY
  if (healthKey) {
    const providedKey = req.headers.get('x-health-key') || req.nextUrl.searchParams.get('key')
    if (providedKey !== healthKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}

  // === Throttled Supabase check (use cached result if fresh) ===
  if (lastHealthCheck && (Date.now() - lastHealthCheck.timestamp) < HEALTH_CHECK_TTL_MS) {
    checks['supabase'] = lastHealthCheck.result['supabase']
    checks['supabase_cached'] = { status: 'true' }
  } else {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl) {
        const dbStart = Date.now()
        const resp = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
          signal: AbortSignal.timeout(5000),
        })
        checks['supabase'] = {
          status: resp.ok ? 'healthy' : 'degraded',
          latencyMs: Date.now() - dbStart,
        }
      } else {
        checks['supabase'] = { status: 'not_configured' }
      }
    } catch (err) {
      checks['supabase'] = {
        status: 'unhealthy',
        error: (err as Error).message,
      }
    }

    // Cache the result
    lastHealthCheck = { result: { ...checks }, timestamp: Date.now() }
  }

  // === Instance info ===
  const uptimeSeconds = Math.floor((Date.now() - INSTANCE_START_TIME) / 1000)

  const overallStatus = Object.values(checks).every(c => c.status === 'healthy' || c.status === 'true') 
    ? 'healthy' 
    : Object.values(checks).some(c => c.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded'

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json({
    status: overallStatus,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    region: process.env.VERCEL_REGION || 'local',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - start,
    checks,
  }, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-TTL': `${HEALTH_CHECK_TTL_MS}ms`,
    }
  })
}
