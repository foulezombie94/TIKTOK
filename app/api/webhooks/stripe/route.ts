import { NextResponse } from 'next/server'

// IMPORTANT: On n'initialise PAS Stripe au top-level du module.
// Si on le fait, Next.js tente de l'exécuter au BUILD et plante
// car STRIPE_SECRET_KEY n'existe pas dans l'environnement Vercel Build.
// On l'initialise à l'intérieur du handler, au moment d'une vraie requête.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Lazy import : Stripe n'est importé que lors d'une vrai requête HTTP
  const Stripe = (await import('stripe')).default

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Variables Stripe manquantes dans les variables d\'environnement.')
    return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20' as any
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Pas de signature Stripe' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const sessionDetail = event.data.object as any
    const userId = sessionDetail.metadata?.userId
    const coinsStr = sessionDetail.metadata?.coins

    if (userId && coinsStr) {
      console.log(`💲 PAIEMENT REÇU ! Créditer ${coinsStr} Coins à l'utilisateur ${userId}`)
      // TODO: Ajouter le crédit Supabase avec supabase_service_role_key ici
    }
  }

  return NextResponse.json({ received: true })
}
