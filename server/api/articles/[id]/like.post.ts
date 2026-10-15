import { notifyArticleLikeCreated } from '../../../utils/adminNotifications'
import { requireVerifiedEmail } from '../../../utils/requireVerifiedEmail'
import { serverSupabaseService } from '../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const userId = await requireVerifiedEmail(event)
  const articleId = getRouterParam(event, 'id')
  if (!articleId) throw createError({ statusCode: 400, message: 'Λείπει το id άρθρου' })

  const supabase = serverSupabaseService()
  const { data: article } = await supabase
    .from('articles')
    .select('id')
    .eq('id', articleId)
    .eq('published', true)
    .maybeSingle()
  if (!article) throw createError({ statusCode: 404, message: 'Δεν βρέθηκε' })

  const { data: existing } = await supabase
    .from('article_likes')
    .select('id')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('article_likes')
    .insert({ user_id: userId, article_id: articleId })
    .select()
    .single()

  if (error) {
    console.error('[articles/[id]/like.post]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  if (data?.id) {
    try {
      await notifyArticleLikeCreated(supabase, data.id)
    } catch (e) {
      console.error('[articles/[id]/like.post] notify', e)
    }
  }

  return data
})
