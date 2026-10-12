import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { nextChapterSlug } from '../../utils/contentSlug'
import { withUniqueSlugRetry } from '../../utils/uniqueViolation'
import { plainGreekLabel } from '#shared/utils/foldGreekSearch.mjs'
import { assertChapterTitleAvailable, CHAPTER_TITLE_TAKEN, rethrowFoldedNameConflict } from '../../utils/foldedName'
import { storedEntityImageUrl } from '../../utils/storedEntityImage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{
    title: string; description?: string; subject_id: string
    image_url?: string; order?: number
  }>(event)
  const title = plainGreekLabel(body.title ?? '')
  if (!title || !body.subject_id) throw createError({ statusCode: 400, message: 'Απαιτούνται τίτλος και μάθημα' })
  const supabase = serverSupabaseService()
  const { data: subject } = await supabase.from('subjects').select('grade_id').eq('id', body.subject_id).single()
  if (!subject) throw createError({ statusCode: 400, message: 'Το μάθημα δεν βρέθηκε' })
  await assertChapterTitleAvailable(supabase, title, body.subject_id)
  const { data, error } = await withUniqueSlugRetry(3, async () => {
    const slug = await nextChapterSlug(supabase, title, body.subject_id)
    return supabase.from('chapters').insert({
      title,
      slug,
      description: body.description ?? null,
      subject_id: body.subject_id,
      grade_id: subject.grade_id,
      image_url: storedEntityImageUrl(body.image_url),
      order: body.order ?? 0,
    }).select().single()
  })
  if (error || !data) {
    rethrowFoldedNameConflict(error, CHAPTER_TITLE_TAKEN)
    console.error('[admin/chapters.post]', error?.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  return data
})
