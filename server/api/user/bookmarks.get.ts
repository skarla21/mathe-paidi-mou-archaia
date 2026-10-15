import { lessonExcerpt } from '#shared/utils/lessonExcerpt.mjs'
import { requireAuth } from '../../utils/requireAuth'
import { serverSupabaseService } from '../../utils/supabaseServer'
import { canonicalLessonPaths } from '../../utils/contentPath'

type LessonRow = {
  id: string
  title: string
  content?: string | null
  is_free: boolean
  price: number
  preview_url?: string | null
  page_count?: number | null
  file_bytes?: number | null
}

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event)
  const supabase = serverSupabaseService()

  const { data, error } = await supabase
    .from('lesson_bookmarks')
    .select('lesson_id, created_at, lessons(id, title, content, is_free, price, preview_url, page_count, file_bytes)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[user/bookmarks.get]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const lessons = (data ?? [])
    .map((row: Record<string, unknown>) => row.lessons as LessonRow | LessonRow[] | null)
    .map((lesson) => (Array.isArray(lesson) ? lesson[0] : lesson))
    .filter((lesson): lesson is LessonRow => Boolean(lesson?.id))

  const paths = await canonicalLessonPaths(supabase, lessons.map((lesson) => lesson.id))
  return lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    is_free: lesson.is_free,
    price: lesson.price,
    preview_url: lesson.preview_url ?? null,
    page_count: lesson.page_count ?? null,
    file_bytes: lesson.file_bytes ?? null,
    excerpt: lessonExcerpt(typeof lesson.content === 'string' ? lesson.content : ''),
    url: paths.get(lesson.id) ?? null,
    bookmarked: true,
  }))
})
