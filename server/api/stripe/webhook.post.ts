import Stripe from 'stripe'

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
  const session = stripeEvent.data.object as Stripe.Checkout.Session
  if (session.mode !== 'payment') return { received: true }
  const userId = session.metadata?.userId ?? session.client_reference_id
  const lessonId = session.metadata?.lessonId
  if (!userId || !lessonId) {
    throw createError({ statusCode: 400, message: 'Missing metadata' })
  }
  const { serverSupabaseService } = await import('../../utils/supabaseServer')
  const supabase = serverSupabaseService()
  const { ensureLessonBookmarkQuiet } = await import('../../utils/lessonBookmarks')
  const { data: existing } = await supabase.from('purchases').select('id').eq('stripe_session_id', session.id).maybeSingle()
  if (existing) {
    await ensureLessonBookmarkQuiet(supabase, userId, lessonId)
    return { received: true }
  }

  const { data: lessonExists } = await supabase.from('lessons').select('id').eq('id', lessonId).maybeSingle()
  if (!lessonExists) {
    console.error('Webhook: lessonId not found in DB:', lessonId)
    throw createError({ statusCode: 400, message: 'Lesson not found' })
  }

  const { data: purchaseRow, error: insertError } = await supabase
    .from('purchases')
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      stripe_session_id: session.id,
    })
    .select('id')
    .single()
  if (insertError) {
    console.error('Purchase insert failed:', insertError)
    throw createError({ statusCode: 500, message: 'Failed to record purchase' })
  }
  if (purchaseRow?.id) {
    const { notifyPurchaseCreated } = await import('../../utils/adminNotifications')
    await notifyPurchaseCreated(supabase, purchaseRow.id)
  }
  await ensureLessonBookmarkQuiet(supabase, userId, lessonId)
  return { received: true }
})
