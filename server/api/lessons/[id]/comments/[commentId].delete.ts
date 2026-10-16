import { requireAuth } from '../../../../utils/requireAuth'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const lessonId = getRouterParam(event, 'id')
  const commentId = getRouterParam(event, 'commentId')
  if (!lessonId || !commentId) {
    throw createError({ statusCode: 400, message: 'Λείπει το id' })
  }

  const userId = requireAuth(event)
  const isAdmin = event.context.auth?.isAdmin === true

  const supabase = serverSupabaseService()
  const { data: existing } = await supabase
    .from('lesson_comments')
    .select('id, user_id, lesson_id')
    .eq('id', commentId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (!existing) throw createError({ statusCode: 404, message: 'Δεν βρέθηκε' })

  if (!isAdmin && existing.user_id !== userId) {
    throw createError({ statusCode: 403, message: 'Απαγορεύεται' })
  }

  const { error } = await supabase
    .from('lesson_comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error(
      '[lessons/[id]/comments/[commentId].delete]',
      error.message,
    )
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  return { ok: true }
})
