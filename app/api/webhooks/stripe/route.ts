import { NextResponse } from 'next/server'
import { createLogger, generateCorrelationId } from '@/lib/logger'

// IMPORTANT: On n'initialise PAS Stripe au top-level du module.
// Si on le fait, Next.js tente de l'exécuter au BUILD et plante
// car STRIPE_SECRET_KEY n'existe pas dans l'environnement Vercel Build.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || generateCorrelationId()
  const log = createLogger({ correlationId, path: '/api/webhooks/stripe' })

  // Lazy imports
  const Stripe = (await import('stripe')).default
  const { createClient } = await import('@supabase/supabase-js')

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecretKey || !webhookSecret) {
    log.error('Missing Stripe environment variables')
    return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
  }

  if (!supabaseUrl || !serviceRoleKey) {
    log.error('Missing Supabase environment variables')
    return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20' as any
  })

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    log.warn('Webhook request without Stripe signature')
    return NextResponse.json({ error: 'Pas de signature Stripe' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    log.error(`Webhook signature verification failed`, err)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  log.info(`Stripe event received: ${event.type}`, { eventId: event.id })

  // === Handle checkout completion ===
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const userId = session.metadata?.userId
    const coinsStr = session.metadata?.coins
    const coins = parseInt(coinsStr || '0', 10)

    if (!userId || !coins || coins <= 0) {
      log.warn('Checkout completed but missing userId or coins in metadata', { 
        userId, coins: coinsStr 
      })
      return NextResponse.json({ received: true })
    }

    log.info(`Processing coin credit`, { userId, coins })

    try {
      // Upsert wallet: Create if not exists, otherwise add coins
      const { error: walletError } = await supabaseAdmin
        .from('wallets')
        .upsert(
          { user_id: userId, balance: coins },
          { onConflict: 'user_id' }
        )

      if (walletError) {
        // Fallback: Try RPC or manual update
        const { error: updateError } = await supabaseAdmin.rpc('credit_wallet', {
          p_user_id: userId,
          p_amount: coins
        })

        if (updateError) {
          // Final fallback: direct update + insert pattern
          const { data: existingWallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single()

          if (existingWallet) {
            await supabaseAdmin
              .from('wallets')
              .update({ balance: existingWallet.balance + coins })
              .eq('user_id', userId)
          } else {
            await supabaseAdmin
              .from('wallets')
              .insert({ user_id: userId, balance: coins })
          }
        }
      }

      // Record the transaction
      await supabaseAdmin.from('transactions').insert({
        sender_id: null, // System (purchase)
        receiver_id: userId,
        amount: coins,
        type: 'purchase',
        video_id: null,
      })

      log.info(`Successfully credited ${coins} coins to user ${userId}`, { 
        userId, coins, stripeSessionId: session.id 
      })
    } catch (err) {
      log.error(`Failed to credit coins`, err as Error, { userId, coins })
      // Return 200 anyway to prevent Stripe retry loops
      // The failed operation will be logged and can be reconciled
    }
  }

  // === Handle payment failed ===
  if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
    const session = event.data.object as any
    log.warn(`Payment failed or expired`, { 
      sessionId: session.id, 
      userId: session.metadata?.userId 
    })
  }

  return NextResponse.json({ received: true })
}
