import {
  ARTICLE_COMMENT_ROOT_LIMIT,
  mergeCommentThreads,
} from '../../../utils/articleCommentThreads'
import { serverSupabaseService } from '../../../utils/supabaseServer'

const COMMENT_SELECT =
  'id, user_id, parent_id, body, created_at, updated_at, users(id, name, avatar_url)'

export default defineEventHandler(async (event) => {
  const articleId = getRouterParam(event, 'id')
  if (!articleId) {
    throw createError({ statusCode: 400, message: 'Λείπει το id άρθρου' })
  }

  const supabase = serverSupabaseService()
  const { data: article } = await supabase
    .from('articles')
    .select('id')
    .eq('id', articleId)
    .eq('published', true)
    .maybeSingle()
  if (!article) throw createError({ statusCode: 404, message: 'Δεν βρέθηκε' })

  const query = getQuery(event)
  const rootLimit = Math.min(
    Math.max(Number(query.limit) || ARTICLE_COMMENT_ROOT_LIMIT, 1),
    500,
  )

  const { data: rootsNewestFirst, error: rootsError } = await supabase
    .from('article_comments')
    .select(COMMENT_SELECT)
    .eq('article_id', articleId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(rootLimit)

  if (rootsError) {
    console.error('[articles/[id]/comments.get] roots', rootsError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const roots = rootsNewestFirst ?? []
  if (!roots.length) return []

  const rootIds = roots.map((row) => row.id)
  const { data: replies, error: repliesError } = await supabase
    .from('article_comments')
    .select(COMMENT_SELECT)
    .eq('article_id', articleId)
    .in('parent_id', rootIds)
    .order('created_at', { ascending: true })

  if (repliesError) {
    console.error('[articles/[id]/comments.get] replies', repliesError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  return mergeCommentThreads(roots, replies ?? [])
})
