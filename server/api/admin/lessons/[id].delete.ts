import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { removeUnusedLessonContent, removeUnusedLessonPreview } from '../../../utils/lessonStorage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })
  const supabase = serverSupabaseService()
  const { data: existing, error: loadError } = await supabase
    .from('lessons')
    .select('content_url, preview_url')
    .eq('id', id)
    .maybeSingle()
  if (loadError) {
    console.error('[admin/lessons/[id].delete] load', loadError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  const contentUrl = existing?.content_url ?? null
  const previewUrl = existing?.preview_url ?? null
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) {
    console.error('[admin/lessons/[id].delete]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  await removeUnusedLessonContent(supabase, contentUrl)
  await removeUnusedLessonPreview(supabase, previewUrl)
  return { ok: true }
})
