import { foldGreekSearch, searchLikePattern } from '#shared/utils/foldGreekSearch.mjs'
import { serverSupabaseAnon } from '../utils/supabaseServer'
import { canonicalLessonPaths, publicSearchResults, SEARCH_CANDIDATE_LIMIT } from '../utils/contentPath'

/** PostgREST `or` value: always double-quote (searchLikePattern may already quote). */
function orLikeValue(pattern: string): string {
  if (pattern.startsWith('"') && pattern.endsWith('"')) return pattern
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string)?.trim()
  if (!q || foldGreekSearch(q).length < 2) {
    return []
  }
  const supabase = serverSupabaseAnon()
  const pattern = searchLikePattern(q)
  const lessonLike = orLikeValue(pattern)
  const [chaptersRes, lessonsRes] = await Promise.all([
    supabase
      .from('chapters')
      .select('id, title, slug, subjects(slug, grades(slug))')
      .like('title_folded', pattern)
      .order('title')
      .limit(SEARCH_CANDIDATE_LIMIT),
    supabase
      .from('lessons')
      .select('id, title')
      .or(`title_folded.like.${lessonLike},tags_folded.like.${lessonLike}`)
      .order('title')
      .limit(SEARCH_CANDIDATE_LIMIT),
  ])
  if (chaptersRes.error || lessonsRes.error) {
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  const lessonIds = (lessonsRes.data ?? []).map((row) => row.id)
  const lessonPaths = await canonicalLessonPaths(supabase, lessonIds)
  return publicSearchResults({
    chapters: chaptersRes.data,
    lessons: lessonsRes.data,
    lessonPaths,
  })
})
