import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { normalizeContentTags } from '../../../utils/contentTags'
import { placementRowsForUpdate } from '../../../utils/placementOrder'
import { removeUnusedLessonContent, removeUnusedLessonPreview } from '../../../utils/lessonStorage'
import { stableLessonSlug } from '../../../utils/contentSlug'
import { isLessonSlugConflict, isUniqueViolation } from '../../../utils/uniqueViolation'

type PlacementInput = {
  subject_id?: string | null
  chapter_id?: string | null
  category_id?: string | null
}

function assertPlacements(placements: PlacementInput[]) {
  if (!placements.length) {
    throw createError({ statusCode: 400, message: 'Χρειάζεται τουλάχιστον μία ανάθεση' })
  }
  for (const p of placements) {
    const count = [p.subject_id, p.chapter_id, p.category_id].filter(Boolean).length
    if (count !== 1) {
      throw createError({ statusCode: 400, message: 'Κάθε ανάθεση πρέπει να αφορά ακριβώς ένα μάθημα, κεφάλαιο ή κατηγορία' })
    }
  }
}

function positiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return Math.floor(value)
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })
  const supabase = serverSupabaseService()
  const body = await readBody<{
    title?: string
    content?: string
    tags?: unknown
    is_free?: boolean
    price?: number
    content_url?: string | null
    preview_url?: string | null
    page_count?: number | null
    file_bytes?: number | null
    placements?: PlacementInput[]
  }>(event)

  if (body.placements !== undefined) assertPlacements(body.placements)

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.content !== undefined) updates.content = body.content || null
  if (body.tags !== undefined) updates.tags = normalizeContentTags(body.tags)
  if (body.is_free !== undefined) updates.is_free = body.is_free
  if (body.price !== undefined) updates.price = body.is_free ? 0 : body.price

  let previousContentUrl: string | null = null
  let previousPreviewUrl: string | null = null
  let previousPageCount: number | null = null
  let previousFileBytes: number | null = null
  let replaceContent = false
  if (body.content_url !== undefined) {
    const { data: existing, error: existingError } = await supabase
      .from('lessons')
      .select('content_url, preview_url, page_count, file_bytes')
      .eq('id', id)
      .maybeSingle()
    if (existingError) {
      console.error('[admin/lessons/[id].patch] load content', existingError.message)
      throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    }
    previousContentUrl = existing?.content_url ?? null
    previousPreviewUrl = existing?.preview_url ?? null
    previousPageCount = existing?.page_count ?? null
    previousFileBytes = existing?.file_bytes ?? null
    const nextContentUrl = body.content_url || null
    updates.content_url = nextContentUrl
    updates.preview_url = nextContentUrl ? (body.preview_url || null) : null
    updates.page_count = nextContentUrl ? positiveInt(body.page_count) : null
    updates.file_bytes = nextContentUrl ? positiveInt(body.file_bytes) : null
    replaceContent = true
  } else if (
    body.preview_url !== undefined
    || body.page_count !== undefined
    || body.file_bytes !== undefined
  ) {
    if (body.preview_url !== undefined) updates.preview_url = body.preview_url || null
    if (body.page_count !== undefined) updates.page_count = positiveInt(body.page_count)
    if (body.file_bytes !== undefined) updates.file_bytes = positiveInt(body.file_bytes)
    if (body.preview_url !== undefined) {
      const { data: existing, error: existingError } = await supabase
        .from('lessons')
        .select('preview_url')
        .eq('id', id)
        .maybeSingle()
      if (existingError) {
        console.error('[admin/lessons/[id].patch] load preview', existingError.message)
        throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
      }
      previousPreviewUrl = existing?.preview_url ?? null
    }
  }

  if (!Object.keys(updates).length && body.placements === undefined) {
    throw createError({ statusCode: 400, message: 'Δεν υπάρχει κάτι για ενημέρωση' })
  }

  let data
  if (Object.keys(updates).length) {
    const result = await supabase.from('lessons').update(updates).eq('id', id).select().single()
    if (result.error) {
      console.error('[admin/lessons/[id].patch]', result.error.message)
      throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    }
    data = result.data
  }

  if (body.placements !== undefined) {
    let originalSlug = ''
    let appliedSlug = ''
    try {
      const { data: existingLesson, error: lessonLookupError } = await supabase
        .from('lessons')
        .select('slug')
        .eq('id', id)
        .maybeSingle()
      if (lessonLookupError || !existingLesson) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
      originalSlug = existingLesson.slug ?? ''
      appliedSlug = originalSlug

      const { data: previous, error: prevErr } = await supabase
        .from('lesson_placements')
        .select('lesson_id, subject_id, chapter_id, category_id, order')
        .eq('lesson_id', id)
      if (prevErr) {
        console.error('[admin/lessons/[id].patch] load placements', prevErr.message)
        throw createError({ statusCode: 500, message: 'Η ανάθεση δεν αποθηκεύτηκε' })
      }

      let placed = false
      for (let attempt = 0; attempt < 3 && !placed; attempt += 1) {
        const slug = await stableLessonSlug(supabase, originalSlug, body.placements, id)
        if (slug !== originalSlug) {
          const { error: slugError } = await supabase.from('lessons').update({ slug }).eq('id', id)
          if (slugError) {
            if ((isLessonSlugConflict(slugError) || isUniqueViolation(slugError)) && attempt < 2) continue
            console.error('[admin/lessons/[id].patch] slug', slugError.message)
            throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
          }
          appliedSlug = slug
        }

        const placementRows = await placementRowsForUpdate(supabase, id, body.placements, previous ?? [])
        const { error: delErr } = await supabase.from('lesson_placements').delete().eq('lesson_id', id)
        if (delErr) {
          console.error('[admin/lessons/[id].patch] delete placements', delErr.message)
          throw createError({ statusCode: 500, message: 'Η ανάθεση δεν αποθηκεύτηκε' })
        }
        const { error: insErr } = await supabase.from('lesson_placements').insert(placementRows)
        if (!insErr) {
          placed = true
          break
        }
        console.error('[admin/lessons/[id].patch] insert placements', insErr.message)
        if (previous?.length) {
          const { error: restoreErr } = await supabase.from('lesson_placements').insert(previous)
          if (restoreErr) console.error('[admin/lessons/[id].patch] restore placements', restoreErr.message)
        }
        if (appliedSlug !== originalSlug) {
          const { error: restoreSlugErr } = await supabase.from('lessons').update({ slug: originalSlug || null }).eq('id', id)
          if (restoreSlugErr) console.error('[admin/lessons/[id].patch] restore slug', restoreSlugErr.message)
          else appliedSlug = originalSlug
        }
        if (isLessonSlugConflict(insErr) && attempt < 2) continue
        if (insErr.code === '23505') {
          throw createError({ statusCode: 409, message: 'Αυτό το υλικό υπάρχει ήδη σε αυτό το μάθημα, κεφάλαιο ή κατηγορία' })
        }
        throw createError({ statusCode: 500, message: 'Η ανάθεση δεν αποθηκεύτηκε' })
      }
      if (!placed) throw createError({ statusCode: 500, message: 'Η ανάθεση δεν αποθηκεύτηκε' })
    } catch (err) {
      if (appliedSlug !== originalSlug) {
        const { error: restoreSlugErr } = await supabase.from('lessons').update({ slug: originalSlug || null }).eq('id', id)
        if (restoreSlugErr) console.error('[admin/lessons/[id].patch] restore slug', restoreSlugErr.message)
      }
      if (replaceContent) {
        const { error: restoreContentErr } = await supabase
          .from('lessons')
          .update({
            content_url: previousContentUrl,
            preview_url: previousPreviewUrl,
            page_count: previousPageCount,
            file_bytes: previousFileBytes,
          })
          .eq('id', id)
        if (restoreContentErr) {
          console.error('[admin/lessons/[id].patch] restore content', restoreContentErr.message)
        }
      }
      throw err
    }
  }

  const nextContentUrl = body.content_url ? body.content_url : null
  if (replaceContent && previousContentUrl && previousContentUrl !== nextContentUrl) {
    await removeUnusedLessonContent(supabase, previousContentUrl)
  }
  const nextPreviewUrl = typeof updates.preview_url === 'string' ? updates.preview_url : null
  if (previousPreviewUrl && previousPreviewUrl !== nextPreviewUrl) {
    await removeUnusedLessonPreview(supabase, previousPreviewUrl)
  }

  return data ?? { ok: true }
})
