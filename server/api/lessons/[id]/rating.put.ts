import { notifyRatingCreated } from '../../../utils/adminNotifications'
import { requireVerifiedEmail } from '../../../utils/requireVerifiedEmail'
import { canAccessLesson } from '../../../utils/access'
import { serverSupabaseService } from '../../../utils/supabaseServer'

async function lessonRatingStats(
  supabase: ReturnType<typeof serverSupabaseService>,
  lessonId: string,
) {
  const { data } = await supabase
    .from('lessons')
    .select('avg_rating, rating_count')
    .eq('id', lessonId)
    .maybeSingle()
  return {
    avgRating: Number(data?.avg_rating ?? 0),
    ratingCount: Number(data?.rating_count ?? 0),
  }
}

export default defineEventHandler(async (event) => {
  const userId = await requireVerifiedEmail(event)
  const lessonId = getRouterParam(event, 'id')
  if (!lessonId) {
    throw createError({ statusCode: 400, message: 'Λείπει το id μαθήματος' })
  }

  const { allowed } = await canAccessLesson(userId, lessonId, true)
  if (!allowed) {
    throw createError({ statusCode: 403, message: 'Απαγορεύεται' })
  }

  const body = await readBody<{ rating: number }>(event)
  if (!body?.rating || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    throw createError({
      statusCode: 400,
      message: 'Η βαθμολογία πρέπει να είναι ακέραιος από 1 έως 5',
    })
  }

  const supabase = serverSupabaseService()
  const { data: existing } = await supabase
    .from('lesson_ratings')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  const { data, error } = await supabase
    .from('lesson_ratings')
    .upsert(
      { user_id: userId, lesson_id: lessonId, rating: body.rating },
      { onConflict: 'user_id,lesson_id' },
    )
    .select()
    .single()

  if (error) {
    console.error('[lessons/[id]/rating.put]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  if (!existing && data?.id) {
    try {
      await notifyRatingCreated(supabase, data.id)
    } catch (e) {
      console.error('[lessons/[id]/rating.put] notify', e)
    }
  }

  const stats = await lessonRatingStats(supabase, lessonId)
  return {
    rating: data.rating as number,
    ...stats,
  }
})
