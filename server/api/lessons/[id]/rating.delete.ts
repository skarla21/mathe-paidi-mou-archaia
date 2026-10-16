import { requireVerifiedEmail } from '../../../utils/requireVerifiedEmail'
import { serverSupabaseService } from '../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  // Own rating may be cleared even if lesson access was later revoked.
  const userId = await requireVerifiedEmail(event)
  const lessonId = getRouterParam(event, 'id')
  if (!lessonId) {
    throw createError({ statusCode: 400, message: 'Λείπει το id μαθήματος' })
  }

  const supabase = serverSupabaseService()
  const { error } = await supabase
    .from('lesson_ratings')
    .delete()
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)

  if (error) {
    console.error('[lessons/[id]/rating.delete]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const { data } = await supabase
    .from('lessons')
    .select('avg_rating, rating_count')
    .eq('id', lessonId)
    .maybeSingle()

  return {
    rating: null,
    avgRating: Number(data?.avg_rating ?? 0),
    ratingCount: Number(data?.rating_count ?? 0),
  }
})
