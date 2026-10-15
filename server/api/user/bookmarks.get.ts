import { lessonExcerpt } from '#shared/utils/lessonExcerpt.mjs'
import {
  publicListPage,
  publicPage,
  publicPageRange,
  publicPageSize,
} from '../../utils/publicListPage'
import { requireAuth } from '../../utils/requireAuth'
import { serverSupabaseService } from '../../utils/supabaseServer'
import { canonicalLessonPaths } from '../../utils/contentPath'

type LessonRow = {
  id: string
  title: string
  content?: string | null
  tags?: string[] | null
  is_free: boolean
  price: number
  preview_url?: string | null
  page_count?: number | null
  file_bytes?: number | null
}

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event)
  const query = getQuery(event)
  const page = publicPage(query.page)
  const pageSize = publicPageSize(query.limit ?? query.pageSize)
  const { from, to } = publicPageRange(page, pageSize)
  const supabase = serverSupabaseService()

  const { data, error, count } = await supabase
    .from('lesson_bookmarks')
    .select(
      'lesson_id, created_at, lessons(id, title, content, tags, is_free, price, preview_url, page_count, file_bytes)',
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[user/bookmarks.get]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const lessons = (data ?? [])
    .map((row: Record<string, unknown>) => row.lessons as LessonRow | LessonRow[] | null)
    .map((lesson) => (Array.isArray(lesson) ? lesson[0] : lesson))
    .filter((lesson): lesson is LessonRow => Boolean(lesson?.id))

  const paths = await canonicalLessonPaths(supabase, lessons.map((lesson) => lesson.id))
  const items = lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    tags: Array.isArray(lesson.tags) ? lesson.tags : [],
    is_free: lesson.is_free,
    price: lesson.price,
    preview_url: lesson.preview_url ?? null,
    page_count: lesson.page_count ?? null,
    file_bytes: lesson.file_bytes ?? null,
    excerpt: lessonExcerpt(typeof lesson.content === 'string' ? lesson.content : ''),
    url: paths.get(lesson.id) ?? null,
    bookmarked: true,
  }))

  return publicListPage(items, count ?? 0, page, pageSize)
})
