import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { keepSubjectSlug } from '../../../utils/contentSlug'
import { listEntityImageUrls, releaseReplacedEntityImage } from '../../../utils/entityImageStorage'
import { withUniqueSlugRetry } from '../../../utils/uniqueViolation'
import { requireExistingRow } from '../../../utils/existingRow'
import { plainGreekLabel } from '#shared/utils/foldGreekSearch.mjs'
import { assertSubjectNameAvailable, rethrowFoldedNameConflict, SUBJECT_NAME_TAKEN } from '../../../utils/foldedName'
import { storedEntityImageUrl } from '../../../utils/storedEntityImage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })
  const body = await readBody<{ name?: string; grade_id?: string; image_url?: string }>(event)
  const updates: Record<string, unknown> = {}
  const supabase = serverSupabaseService()
  if (body.name !== undefined) updates.name = plainGreekLabel(body.name)
  const nextImageUrl = body.image_url !== undefined ? storedEntityImageUrl(body.image_url) : undefined
  if (nextImageUrl !== undefined) updates.image_url = nextImageUrl
  if (body.grade_id !== undefined) updates.grade_id = body.grade_id
  if (!Object.keys(updates).length) throw createError({ statusCode: 400, message: 'Δεν υπάρχει κάτι για ενημέρωση' })
  const existingResult = await supabase
    .from('subjects')
    .select('name, slug, grade_id')
    .eq('id', id)
    .maybeSingle()
  const existing = requireExistingRow(
    existingResult.data,
    existingResult.error,
    '[admin/subjects/[id].patch]',
    'Το μάθημα δεν βρέθηκε',
  )
  const name = body.name !== undefined ? plainGreekLabel(body.name) : existing.name
  const parentGradeId = body.grade_id ?? existing.grade_id
  await assertSubjectNameAvailable(supabase, name, parentGradeId, id)
  const movedGradeId = body.grade_id !== undefined && body.grade_id !== existing.grade_id ? body.grade_id : null
  const currentSlug = existing.slug ?? ''
  let previousImageUrl: string | null = null
  if (body.image_url !== undefined) {
    const urls = await listEntityImageUrls(supabase, 'subjects', 'id', id)
    if (!urls) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    previousImageUrl = urls[0] ?? null
  }
  const gradeId = movedGradeId
  const saved = gradeId
    ? await withUniqueSlugRetry(3, async () => {
        if (!gradeId) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
        const slug = await keepSubjectSlug(supabase, currentSlug, gradeId, id)
        return supabase.from('subjects').update({ ...updates, slug }).eq('id', id).select().single()
      })
    : await supabase.from('subjects').update(updates).eq('id', id).select().single()
  const { data, error } = saved
  if (error) {
    rethrowFoldedNameConflict(error, SUBJECT_NAME_TAKEN)
    console.error('[admin/subjects/[id].patch]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  if (body.image_url !== undefined) {
    await releaseReplacedEntityImage(supabase, previousImageUrl, nextImageUrl)
  }
  return data
})
