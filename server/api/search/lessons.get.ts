import { foldGreekSearch, searchLikePattern } from '#shared/utils/foldGreekSearch.mjs'
import { canonicalLessonPaths } from '../../utils/contentPath'
import {
  emptyLessonSearchPage,
  LESSON_SEARCH_FETCH_CAP,
  LESSON_SEARCH_PAGE_SIZE,
  mapLessonSearchRows,
  paginateLessonSearchItems,
  withLessonSearchBookmarks,
} from '../../utils/lessonSearchPage'
import { adminPage } from '../../utils/adminList'
import { serverSupabaseAnon, serverSupabaseService } from '../../utils/supabaseServer'

/** PostgREST `or` value: always double-quote (searchLikePattern may already quote). */
function orLikeValue(pattern: string): string {
  if (pattern.startsWith('"') && pattern.endsWith('"')) return pattern
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string)?.trim() ?? ''
  const page = adminPage(query.page)

  if (!q || foldGreekSearch(q).length < 2) {
    return emptyLessonSearchPage(page)
  }

  const supabase = serverSupabaseAnon()
  const like = orLikeValue(searchLikePattern(q))
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, slug, is_free, content, tags, preview_url, page_count, file_bytes')
    .or(`title_folded.like.${like},tags_folded.like.${like}`)
    .order('title')
    .limit(LESSON_SEARCH_FETCH_CAP)

  if (error) {
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const rows = data ?? []
  const lessonPaths = await canonicalLessonPaths(
    supabase,
    rows.map((row) => row.id),
  )
  const mapped = mapLessonSearchRows(rows, lessonPaths)
  const pageResult = paginateLessonSearchItems(mapped, page, LESSON_SEARCH_PAGE_SIZE)

  const userId = event.context.auth?.userId ?? null
  if (!userId || !pageResult.items.length) {
    return pageResult
  }

  const service = serverSupabaseService()
  const { data: bookmarks, error: bookmarkError } = await service
    .from('lesson_bookmarks')
    .select('lesson_id')
    .eq('user_id', userId)
    .in(
      'lesson_id',
      pageResult.items.map((item) => item.id),
    )
  if (bookmarkError) {
    console.error('[search/lessons.get] bookmarks', bookmarkError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const saved = new Set((bookmarks ?? []).map((row) => row.lesson_id as string))
  return {
    ...pageResult,
    items: withLessonSearchBookmarks(pageResult.items, saved),
  }
})
