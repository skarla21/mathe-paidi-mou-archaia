import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing article id' })

  const supabase = serverSupabaseService()
  const { data: article, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle()

  if (error) {
    console.error('[articles/[id].get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  if (!article) throw createError({ statusCode: 404, message: 'Not found' })

  const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
    supabase.from('article_likes').select('*', { count: 'exact', head: true }).eq('article_id', id),
    supabase.from('article_comments').select('*', { count: 'exact', head: true }).eq('article_id', id),
  ])

  const userId = event.context.auth?.userId ?? null
  let likedByMe = false
  if (userId) {
    const { data: likeRow } = await supabase
      .from('article_likes')
      .select('id')
      .eq('article_id', id)
      .eq('user_id', userId)
      .maybeSingle()
    likedByMe = Boolean(likeRow)
  }

  return {
    ...article,
    likeCount: likeCount ?? 0,
    commentCount: commentCount ?? 0,
    likedByMe,
  }
})
