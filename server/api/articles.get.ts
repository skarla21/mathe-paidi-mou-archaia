import { foldGreekSearch, searchLikePattern } from '#shared/utils/foldGreekSearch.mjs'
import { publicArticleList } from '../utils/articleList'
import {
  publicListPage,
  publicPage,
  publicPageRange,
  publicPageSize,
} from '../utils/publicListPage'
import { serverSupabaseService } from '../utils/supabaseServer'

/** PostgREST `or` value: always double-quote (searchLikePattern may already quote). */
function orLikeValue(pattern: string): string {
  if (pattern.startsWith('"') && pattern.endsWith('"')) return pattern
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = publicPage(query.page)
  const pageSize = publicPageSize(query.limit ?? query.pageSize)
  const { from, to } = publicPageRange(page, pageSize)
  const q = String(Array.isArray(query.q) ? query.q[0] : query.q ?? '').trim()

  const supabase = serverSupabaseService()
  // Body is only loaded for the current page (excerpted in publicArticleList).
  let qBuilder = supabase
    .from('articles')
    .select(
      'id, title, slug, body, tags, reading_time_minutes, image_url, created_at',
      { count: 'exact' },
    )
    .eq('published', true)

  if (q && foldGreekSearch(q)) {
    const like = orLikeValue(searchLikePattern(q))
    qBuilder = qBuilder.or(
      `title_folded.like.${like},tags_folded.like.${like}`,
    )
  }

  const { data, error, count } = await qBuilder
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[articles.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  return publicListPage(
    publicArticleList(data ?? []),
    count ?? 0,
    page,
    pageSize,
  )
})
