import { isUuid } from '#shared/utils/isUuid.mjs'
import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Λείπει το slug άρθρου' })

  const supabase = serverSupabaseService()
  const { data: bySlug, error: slugError } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (slugError) {
    console.error('[articles/[slug].get]', slugError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  let article = bySlug
  if (!article && isUuid(slug)) {
    const { data: byId, error: idError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', slug)
      .eq('published', true)
      .maybeSingle()
    if (idError) {
      console.error('[articles/[slug].get]', idError.message)
      throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    }
    article = byId
  }

  if (!article) throw createError({ statusCode: 404, message: 'Δεν βρέθηκε' })

  const articleId = article.id as string
  const [{ count: likeCount }, { count: commentCount }] = await Promise.all([
    supabase.from('article_likes').select('*', { count: 'exact', head: true }).eq('article_id', articleId),
    supabase.from('article_comments').select('*', { count: 'exact', head: true }).eq('article_id', articleId),
  ])

  const userId = event.context.auth?.userId ?? null
  let likedByMe = false
  if (userId) {
    const { data: likeRow } = await supabase
      .from('article_likes')
      .select('id')
      .eq('article_id', articleId)
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
