import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { nextSubjectSlug } from '../../utils/contentSlug'
import { withUniqueSlugRetry } from '../../utils/uniqueViolation'
import { plainGreekLabel } from '#shared/utils/foldGreekSearch.mjs'
import { assertSubjectNameAvailable, rethrowFoldedNameConflict, SUBJECT_NAME_TAKEN } from '../../utils/foldedName'
import { storedEntityImageUrl } from '../../utils/storedEntityImage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ name: string; grade_id: string; image_url?: string }>(event)
  const name = plainGreekLabel(body.name ?? '')
  if (!name || !body.grade_id) throw createError({ statusCode: 400, message: 'Απαιτούνται όνομα και τάξη' })
  const supabase = serverSupabaseService()
  await assertSubjectNameAvailable(supabase, name, body.grade_id)
  const { data, error } = await withUniqueSlugRetry(3, async () => {
    const slug = await nextSubjectSlug(supabase, name, body.grade_id)
    return supabase.from('subjects').insert({
      name,
      slug,
      grade_id: body.grade_id,
      image_url: storedEntityImageUrl(body.image_url),
    }).select().single()
  })
  if (error || !data) {
    rethrowFoldedNameConflict(error, SUBJECT_NAME_TAKEN)
    console.error('[admin/subjects.post]', error?.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  return data
})
