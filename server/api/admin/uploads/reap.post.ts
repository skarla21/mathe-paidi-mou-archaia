import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { reapOrphanEntityImages } from '../../../utils/entityImageStorage'
import { reapOrphanLessonContent, reapOrphanLessonPreviews } from '../../../utils/lessonStorage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const supabase = serverSupabaseService()
  try {
    await reapOrphanLessonContent(supabase)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'reap failed'
    console.error('[admin/uploads/reap] lessons', message)
  }
  try {
    await reapOrphanLessonPreviews(supabase)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'reap failed'
    console.error('[admin/uploads/reap] lesson-previews', message)
  }
  try {
    await reapOrphanEntityImages(supabase)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'reap failed'
    console.error('[admin/uploads/reap] images', message)
  }
  return { ok: true }
})
