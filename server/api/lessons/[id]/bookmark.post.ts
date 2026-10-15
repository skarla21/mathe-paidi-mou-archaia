import { requireAuth } from '../../../utils/requireAuth'
import { serverSupabaseService } from '../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event)
  const lessonId = getRouterParam(event, 'id')
  if (!lessonId) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })

  const supabase = serverSupabaseService()
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id')
    .eq('id', lessonId)
    .maybeSingle()
  if (!lesson) throw createError({ statusCode: 404, message: 'Δεν βρέθηκε' })

  const { data: existing } = await supabase
    .from('lesson_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('lesson_bookmarks')
      .delete()
      .eq('id', existing.id)
    if (error) {
      console.error('[lessons/[id]/bookmark.post] delete', error.message)
      throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    }
    return { saved: false }
  }

  const { error } = await supabase
    .from('lesson_bookmarks')
    .insert({ user_id: userId, lesson_id: lessonId })
  if (error) {
    if (error.code === '23505') return { saved: true }
    console.error('[lessons/[id]/bookmark.post] insert', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  return { saved: true }
})
