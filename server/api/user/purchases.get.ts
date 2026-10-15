import {
  publicListPage,
  publicPage,
  publicPageRange,
  publicPageSize,
} from '../../utils/publicListPage'
import { requireAuth } from '../../utils/requireAuth'
import { serverSupabaseService } from '../../utils/supabaseServer'
import { canonicalLessonPaths } from '../../utils/contentPath'

export default defineEventHandler(async (event) => {
  const userId = requireAuth(event)
  const query = getQuery(event)
  const page = publicPage(query.page)
  const pageSize = publicPageSize(query.limit ?? query.pageSize)
  const { from, to } = publicPageRange(page, pageSize)
  const supabase = serverSupabaseService()

  const { data, error, count } = await supabase
    .from('purchases')
    .select('lesson_id, lessons(id, title, is_free, price)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[user/purchases.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  const lessons = (data ?? [])
    .map((p: Record<string, unknown>) => p.lessons as { id: string; title: string; is_free: boolean; price: number } | null)
    .filter((lesson): lesson is { id: string; title: string; is_free: boolean; price: number } => Boolean(lesson))
  const paths = await canonicalLessonPaths(supabase, lessons.map((lesson) => lesson.id))
  const items = lessons.map((lesson) => ({ ...lesson, url: paths.get(lesson.id) ?? null }))
  return publicListPage(items, count ?? 0, page, pageSize)
})
