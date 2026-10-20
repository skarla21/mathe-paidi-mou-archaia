import Stripe from 'stripe'
import { applyCompletedCheckout } from '../../utils/stripePurchase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const secret = config.stripeWebhookSecret as string
  if (!secret) {
    throw createError({ statusCode: 500, message: 'Webhook secret not configured' })
  }
  const body = await readRawBody(event)
  const sig = getHeader(event, 'stripe-signature')
  if (!body || !sig) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }
  const stripe = new Stripe(config.stripeSecretKey as string)
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    throw createError({ statusCode: 400, message })
  }
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { received: true }
  }
  const { serverSupabaseService } = await import('../../utils/supabaseServer')
  return applyCompletedCheckout(
    serverSupabaseService(),
    stripeEvent.data.object as Stripe.Checkout.Session,
  )
})
