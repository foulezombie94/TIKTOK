/**
 * Metrics Collector Endpoint — Pilier 4: Observabilité
 * 
 * Receives client-side performance metrics and server-side error reports.
 * Stores them in structured logs for Loki/ELK/CloudWatch ingestion.
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface Metric {
  name: string
  value: number
  unit: string
  tags?: Record<string, string>
  timestamp: number
}

// In-memory aggregation (per serverless instance)
const aggregated: Record<string, { sum: number; count: number; min: number; max: number }> = {}

export async function POST(req: Request) {
  try {
    const { metrics } = await req.json() as { metrics: Metric[] }

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json({ error: 'No metrics provided' }, { status: 400 })
    }

    // Cap at 50 metrics per request to prevent abuse
    const batch = metrics.slice(0, 50)

    for (const metric of batch) {
      // Validate
      if (!metric.name || typeof metric.value !== 'number') continue

      // Aggregate
      if (!aggregated[metric.name]) {
        aggregated[metric.name] = { sum: 0, count: 0, min: Infinity, max: -Infinity }
      }
      const agg = aggregated[metric.name]
      agg.sum += metric.value
      agg.count++
      agg.min = Math.min(agg.min, metric.value)
      agg.max = Math.max(agg.max, metric.value)

      // Log in structured format for ingestion
      console.log(JSON.stringify({
        level: 'info',
        msg: 'metric',
        timestamp: new Date(metric.timestamp).toISOString(),
        service: 'tiktok-clone',
        metric: {
          name: metric.name,
          value: metric.value,
          unit: metric.unit,
          tags: metric.tags,
          aggregated: {
            avg: Math.round(agg.sum / agg.count),
            min: agg.min,
            max: agg.max,
            count: agg.count,
          }
        }
      }))
    }

    return NextResponse.json({ received: batch.length }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function GET() {
  // Return current aggregated stats (for Prometheus-style scraping)
  const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {}
  
  for (const [name, agg] of Object.entries(aggregated)) {
    stats[name] = {
      avg: agg.count > 0 ? Math.round(agg.sum / agg.count) : 0,
      min: agg.min === Infinity ? 0 : agg.min,
      max: agg.max === -Infinity ? 0 : agg.max,
      count: agg.count,
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    metrics: stats,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    }
  })
}
