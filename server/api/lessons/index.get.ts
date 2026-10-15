import { publicLessonList } from '#shared/utils/publicLessonList.mjs'
import { requireAdmin } from '../../utils/requireAdmin'
import {
  publicListPage,
  publicPage,
  publicPageRange,
  publicPageSize,
} from '../../utils/publicListPage'
import { serverSupabaseAnon, serverSupabaseService } from '../../utils/supabaseServer'

/** Admin reorder modal may load one parent's full light list, hard-capped. */
const REORDER_FETCH_CAP = 500

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const subjectId = query.subject_id as string | undefined
  const chapterId = query.chapter_id as string | undefined
  const categoryId = query.category_id as string | undefined
  const parentCount = [subjectId, chapterId, categoryId].filter(Boolean).length
  if (parentCount !== 1) {
    throw createError({ statusCode: 400, message: 'Exactly one of subject_id, chapter_id, or category_id is required' })
  }

  const wantAll = String(query.all ?? '') === '1'
  if (wantAll) requireAdmin(event)

  const supabase = serverSupabaseAnon()
  const select = wantAll
    ? 'order, lessons(id, title)'
    : 'order, lessons(id, slug, title, content, tags, is_free, price, created_at, preview_url, page_count, file_bytes)'

  let q = supabase.from('lesson_placements').select(select, { count: 'exact' })
  if (subjectId) q = q.eq('subject_id', subjectId)
  if (chapterId) q = q.eq('chapter_id', chapterId)
  if (categoryId) q = q.eq('category_id', categoryId)

  const page = publicPage(query.page)
  const pageSize = publicPageSize(query.limit ?? query.pageSize)
  const { from, to } = wantAll
    ? { from: 0, to: REORDER_FETCH_CAP - 1 }
    : publicPageRange(page, pageSize)

  const { data, error, count } = await q.order('order', { ascending: true }).range(from, to)
  if (error) {
    console.error('[lessons/index.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  if (wantAll) {
    const items = (data ?? []).flatMap((row: { order: number; lessons: unknown }) => {
      const nested = row.lessons
      const lesson = Array.isArray(nested) ? nested[0] : nested
      if (!lesson || typeof lesson !== 'object') return []
      const { id, title } = lesson as { id?: string; title?: string }
      if (!id) return []
      return [{ id, title: title ?? '', order: row.order }]
    })
    const total = count ?? items.length
    return {
      ...publicListPage(items, total, 1, REORDER_FETCH_CAP),
      truncated: total > items.length,
    }
  }

  const lessons = publicLessonList(data ?? []) as Array<Record<string, unknown> & { id: string }>
  const userId = event.context.auth?.userId ?? null
  if (!userId || !lessons.length) {
    return publicListPage(lessons, count ?? 0, page, pageSize)
  }

  const service = serverSupabaseService()
  const { data: bookmarks, error: bookmarkError } = await service
    .from('lesson_bookmarks')
    .select('lesson_id')
    .eq('user_id', userId)
    .in('lesson_id', lessons.map((lesson) => lesson.id))
  if (bookmarkError) {
    console.error('[lessons/index.get] bookmarks', bookmarkError.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  const saved = new Set((bookmarks ?? []).map((row) => row.lesson_id as string))
  const items = lessons.map((lesson) => ({
    ...lesson,
    bookmarked: saved.has(lesson.id),
  }))
  return publicListPage(items, count ?? 0, page, pageSize)
})
