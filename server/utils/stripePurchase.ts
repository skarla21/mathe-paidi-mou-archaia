import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { notifyPurchaseCreated } from './adminNotifications'
import { ensureLessonBookmarkQuiet } from './lessonBookmarks'

export function metadataTime(value: string | undefined) {
  if (!value) return null
  const time = Date.parse(value)
  if (Number.isNaN(time)) return null
  return new Date(time).toISOString()
}

type CheckoutSession = {
  id: string
  mode?: string | null
  client_reference_id?: string | null
  metadata?: {
    userId?: string
    lessonId?: string
    termsAcceptedAt?: string
    immediateAccessAcceptedAt?: string
  } | null
}

export async function applyCompletedCheckout(
  supabase: SupabaseClient,
  session: CheckoutSession,
): Promise<{ received: true }> {
  if (session.mode !== 'payment') return { received: true }

  const userId = session.metadata?.userId ?? session.client_reference_id
  const lessonId = session.metadata?.lessonId
  if (!userId || !lessonId) {
    throw createError({ statusCode: 400, message: 'Missing metadata' })
  }

  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle()
  if (existing) {
    await ensureLessonBookmarkQuiet(supabase, userId, lessonId)
    return { received: true }
  }

  const { data: lessonExists } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .maybeSingle()
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
      terms_accepted_at: metadataTime(session.metadata?.termsAcceptedAt),
      immediate_access_accepted_at: metadataTime(session.metadata?.immediateAccessAcceptedAt),
    })
    .select('id')
    .single()
  if (insertError) {
    console.error('Purchase insert failed:', insertError)
    throw createError({ statusCode: 500, message: 'Failed to record purchase' })
  }
  if (purchaseRow?.id) {
    await notifyPurchaseCreated(supabase, purchaseRow.id)
  }
  await ensureLessonBookmarkQuiet(supabase, userId, lessonId)
  return { received: true }
}
