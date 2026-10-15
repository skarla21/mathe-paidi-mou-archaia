import { publicLessonList } from '#shared/utils/publicLessonList.mjs'
import { serverSupabaseAnon, serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const subjectId = query.subject_id as string | undefined
  const chapterId = query.chapter_id as string | undefined
  const categoryId = query.category_id as string | undefined
  const parentCount = [subjectId, chapterId, categoryId].filter(Boolean).length
  if (parentCount !== 1) {
    throw createError({ statusCode: 400, message: 'Exactly one of subject_id, chapter_id, or category_id is required' })
  }
  const supabase = serverSupabaseAnon()
  let q = supabase
    .from('lesson_placements')
    .select('order, lessons(id, slug, title, content, is_free, price, created_at, preview_url, page_count, file_bytes)')
  if (subjectId) q = q.eq('subject_id', subjectId)
  if (chapterId) q = q.eq('chapter_id', chapterId)
  if (categoryId) q = q.eq('category_id', categoryId)
  const { data, error } = await q.order('order', { ascending: true })
  if (error) {
    console.error('[lessons/index.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  const lessons = publicLessonList(data ?? []) as Array<Record<string, unknown> & { id: string }>
  const userId = event.context.auth?.userId ?? null
  if (!userId || !lessons.length) return lessons

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
  return lessons.map((lesson) => ({
    ...lesson,
    bookmarked: saved.has(lesson.id),
  }))
})
