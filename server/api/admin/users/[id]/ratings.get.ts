import { loadAdminDetailPage } from '../../../../utils/adminDetailPage'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const supabase = serverSupabaseService()
  return loadAdminDetailPage(event, supabase, {
    table: 'lesson_ratings',
    select: '*, lessons(title)',
    eq: { column: 'user_id', value: id },
    order: { column: 'created_at', ascending: false },
    logLabel: '[admin/users/[id]/ratings.get]',
  })
})
