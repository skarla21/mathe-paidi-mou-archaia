import Stripe from 'stripe'
import { requireAuth } from '../../utils/requireAuth'
import { canonicalLessonPaths } from '../../utils/contentPath'
import { lessonCheckoutPath } from '../../utils/lessonCheckoutPath'

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event)
  const body = await readBody(event).catch(() => ({}))
  const lessonId = body?.lessonId as string
  if (!lessonId) {
    throw createError({ statusCode: 400, message: 'lessonId required' })
  }
  if (body?.acceptTerms !== true || body?.acceptImmediateAccess !== true) {
    throw createError({
      statusCode: 400,
      message: 'Αποδέξου τους όρους χρήσης και την άμεση έναρξη της πρόσβασης για να συνεχίσεις',
    })
  }
  const config = useRuntimeConfig()
  const secret = config.stripeSecretKey as string
  if (!secret) {
    throw createError({ statusCode: 500, message: 'Stripe not configured' })
  }
  const stripe = new Stripe(secret)
  const { serverSupabaseService } = await import('../../utils/supabaseServer')
  const supabase = serverSupabaseService()
  const { data: lesson, error: lessonError } = await supabase.from('lessons').select('id, title, is_free, price').eq('id', lessonId).single()
  if (lessonError || !lesson || lesson.is_free) {
    throw createError({ statusCode: 400, message: 'Invalid or free lesson' })
  }
  const price = Number(lesson.price) || 0
  if (price <= 0) {
    throw createError({ statusCode: 400, message: 'Lesson has no price' })
  }
  const paths = await canonicalLessonPaths(supabase, [lessonId])
  const lessonPath = lessonCheckoutPath(paths, lessonId)
  if (!lessonPath) {
    throw createError({ statusCode: 409, message: 'Το υλικό δεν έχει δημόσια διεύθυνση' })
  }
  const origin = getRequestURL(event).origin
  const acceptedAt = new Date().toISOString()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price_data: { currency: 'eur', unit_amount: price, product_data: { name: lesson.title } }, quantity: 1 }],
    success_url: `${origin}${lessonPath}?success=1`,
    cancel_url: `${origin}${lessonPath}?cancel=1`,
    client_reference_id: userId,
    metadata: {
      lessonId,
      userId,
      termsAcceptedAt: acceptedAt,
      immediateAccessAcceptedAt: acceptedAt,
    },
  })
  return { url: session.url }
})
