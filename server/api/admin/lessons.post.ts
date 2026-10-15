import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { placementRowsForCreate } from '../../utils/placementOrder'
import { nextLessonSlug } from '../../utils/contentSlug'
import { isLessonSlugConflict, isUniqueViolation } from '../../utils/uniqueViolation'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{
    title: string
    content?: string
    is_free?: boolean
    price?: number
    content_url?: string
    preview_url?: string | null
    page_count?: number | null
    file_bytes?: number | null
    placements?: Array<{ subject_id?: string | null; chapter_id?: string | null; category_id?: string | null }>
  }>(event)
  if (!body.title?.trim()) throw createError({ statusCode: 400, message: 'Ο τίτλος είναι υποχρεωτικός' })
  if (!body.placements?.length) {
    throw createError({ statusCode: 400, message: 'Χρειάζεται τουλάχιστον μία ανάθεση' })
  }
  for (const p of body.placements) {
    const count = [p.subject_id, p.chapter_id, p.category_id].filter(Boolean).length
    if (count !== 1) {
      throw createError({ statusCode: 400, message: 'Κάθε ανάθεση πρέπει να αφορά ακριβώς ένα μάθημα, κεφάλαιο ή κατηγορία' })
    }
  }
  const supabase = serverSupabaseService()
  const title = body.title.trim()
  let placementErr: { code?: string; message?: string } | null = null
  const contentUrl = body.content_url ?? null
  const previewUrl = contentUrl ? (body.preview_url ?? null) : null
  const pageCount = contentUrl && body.page_count != null && body.page_count > 0
    ? Math.floor(body.page_count)
    : null
  const fileBytes = contentUrl && body.file_bytes != null && body.file_bytes > 0
    ? Math.floor(body.file_bytes)
    : null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await nextLessonSlug(supabase, title, body.placements)
    const { data, error } = await supabase.from('lessons').insert({
      title,
      slug,
      content: body.content ?? null,
      is_free: body.is_free ?? true,
      price: body.is_free ? 0 : (body.price ?? 0),
      content_url: contentUrl,
      preview_url: previewUrl,
      page_count: pageCount,
      file_bytes: fileBytes,
    }).select().single()
    if (error || !data) {
      if (isUniqueViolation(error) && attempt < 2) continue
      console.error('[admin/lessons.post]', error?.message)
      throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    }

    const placementRows = await placementRowsForCreate(supabase, data.id, body.placements)
    const placed = await supabase.from('lesson_placements').insert(placementRows)
    if (!placed.error) return data

    placementErr = placed.error
    console.error('[admin/lessons.post] placements', placed.error.message)
    await supabase.from('lessons').delete().eq('id', data.id)
    if (isLessonSlugConflict(placed.error) && attempt < 2) continue
    break
  }

  if (placementErr && placementErr.code === '23505' && !isLessonSlugConflict(placementErr)) {
    throw createError({ statusCode: 409, message: 'Αυτό το υλικό υπάρχει ήδη σε αυτό το μάθημα, κεφάλαιο ή κατηγορία' })
  }
  throw createError({ statusCode: 500, message: 'Η ανάθεση δεν αποθηκεύτηκε' })
})
