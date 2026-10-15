import { loadAdminDetailPage } from '../../../../utils/adminDetailPage'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const supabase = serverSupabaseService()
  const page = await loadAdminDetailPage(event, supabase, {
    table: 'lesson_ratings',
    select: '*, users(name, email, avatar_url)',
    eq: { column: 'lesson_id', value: id },
    order: { column: 'created_at', ascending: false },
    logLabel: '[admin/lessons/[id]/ratings.get]',
  })

  const { data: ratingRows, error: avgError } = await supabase
    .from('lesson_ratings')
    .select('rating')
    .eq('lesson_id', id)

  if (avgError) {
    console.error('[admin/lessons/[id]/ratings.get] avg', avgError.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  const ratings = (ratingRows ?? []).map((row) => Number(row.rating)).filter(Number.isFinite)
  const averageRating = ratings.length
    ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10
    : 0

  return { ...page, averageRating }
})
