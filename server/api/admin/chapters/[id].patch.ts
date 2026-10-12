import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { keepChapterSlug } from '../../../utils/contentSlug'
import { listEntityImageUrls, releaseReplacedEntityImage } from '../../../utils/entityImageStorage'
import { withUniqueSlugRetry } from '../../../utils/uniqueViolation'
import { requireExistingRow } from '../../../utils/existingRow'
import { plainGreekLabel } from '#shared/utils/foldGreekSearch.mjs'
import { assertChapterTitleAvailable, CHAPTER_TITLE_TAKEN, rethrowFoldedNameConflict } from '../../../utils/foldedName'
import { storedEntityImageUrl } from '../../../utils/storedEntityImage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })
  const body = await readBody<{
    title?: string; description?: string; subject_id?: string
    image_url?: string; order?: number
  }>(event)
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = plainGreekLabel(body.title)
  if (body.description !== undefined) updates.description = body.description || null
  const nextImageUrl = body.image_url !== undefined ? storedEntityImageUrl(body.image_url) : undefined
  if (nextImageUrl !== undefined) updates.image_url = nextImageUrl
  if (body.order !== undefined) updates.order = body.order
  const supabase = serverSupabaseService()
  let destinationGradeId: string | null = null
  if (body.subject_id !== undefined) {
    const { data: subject } = await supabase.from('subjects').select('grade_id').eq('id', body.subject_id).single()
    if (!subject) throw createError({ statusCode: 400, message: 'Το μάθημα δεν βρέθηκε' })
    destinationGradeId = subject.grade_id
  }
  if (!Object.keys(updates).length && body.subject_id === undefined) {
    throw createError({ statusCode: 400, message: 'Δεν υπάρχει κάτι για ενημέρωση' })
  }
  const existingResult = await supabase
    .from('chapters')
    .select('title, slug, subject_id')
    .eq('id', id)
    .maybeSingle()
  const existing = requireExistingRow(
    existingResult.data,
    existingResult.error,
    '[admin/chapters/[id].patch]',
    'Το κεφάλαιο δεν βρέθηκε',
  )
  let movedSubjectId: string | null = null
  if (body.subject_id !== undefined && destinationGradeId) {
    updates.subject_id = body.subject_id
    updates.grade_id = destinationGradeId
    if (body.subject_id !== existing.subject_id) movedSubjectId = body.subject_id
  }
  const title = body.title !== undefined ? plainGreekLabel(body.title) : existing.title
  const parentSubjectId = body.subject_id ?? existing.subject_id
  await assertChapterTitleAvailable(supabase, title, parentSubjectId, id)
  const currentSlug = existing.slug ?? ''
  let previousImageUrl: string | null = null
  if (body.image_url !== undefined) {
    const urls = await listEntityImageUrls(supabase, 'chapters', 'id', id)
    if (!urls) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    previousImageUrl = urls[0] ?? null
  }
  const subjectId = movedSubjectId
  const { data, error } = subjectId
    ? await withUniqueSlugRetry(3, async () => {
        if (!subjectId) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
        const slug = await keepChapterSlug(supabase, currentSlug, subjectId, id)
        return supabase.from('chapters').update({ ...updates, slug }).eq('id', id).select().single()
      })
    : await supabase.from('chapters').update(updates).eq('id', id).select().single()
  if (error) {
    rethrowFoldedNameConflict(error, CHAPTER_TITLE_TAKEN)
    console.error('[admin/chapters/[id].patch]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  if (body.image_url !== undefined) {
    await releaseReplacedEntityImage(supabase, previousImageUrl, nextImageUrl)
  }
  return data
})
