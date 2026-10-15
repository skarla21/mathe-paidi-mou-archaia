import {
  ARTICLE_COMMENT_REPLY_CAP_PER_ROOT,
  ARTICLE_COMMENT_ROOT_LIMIT,
  ARTICLE_COMMENT_ROOT_MAX,
  mergeCommentThreads,
} from '../../../../utils/articleCommentThreads'
import { publicPage } from '../../../../utils/publicListPage'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

const COMMENT_SELECT =
  'id, user_id, parent_id, body, created_at, updated_at, users(id, name, avatar_url)'

export default defineEventHandler(async (event) => {
  const articleId = getRouterParam(event, 'slug')
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
  const page = publicPage(query.page)
  const pageSize = Math.min(
    Math.max(Number(query.limit) || ARTICLE_COMMENT_ROOT_LIMIT, 1),
    ARTICLE_COMMENT_ROOT_MAX,
  )
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const {
    data: rootsNewestFirst,
    error: rootsError,
    count: totalRoots,
  } = await supabase
    .from('article_comments')
    .select(COMMENT_SELECT, { count: 'exact' })
    .eq('article_id', articleId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (rootsError) {
    console.error('[articles/[slug]/comments.get] roots', rootsError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const roots = rootsNewestFirst ?? []
  const total = totalRoots ?? 0
  if (!roots.length) {
    return {
      items: [],
      totalRoots: total,
      page,
      pageSize,
      hasMore: false,
    }
  }

  const rootIds = roots.map((row) => row.id as string)
  const replyResults = await Promise.all(
    rootIds.map(async (rootId) => {
      const { data, error } = await supabase
        .from('article_comments')
        .select(COMMENT_SELECT)
        .eq('article_id', articleId)
        .eq('parent_id', rootId)
        .order('created_at', { ascending: true })
        .limit(ARTICLE_COMMENT_REPLY_CAP_PER_ROOT)
      if (error) throw error
      return data ?? []
    }),
  ).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[articles/[slug]/comments.get] replies', message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  })

  const replies = replyResults.flat()
  return {
    items: mergeCommentThreads(roots, replies),
    totalRoots: total,
    page,
    pageSize,
    hasMore: from + roots.length < total,
  }
})
