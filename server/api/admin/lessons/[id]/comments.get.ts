import { loadAdminDetailPage } from '../../../../utils/adminDetailPage'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const supabase = serverSupabaseService()
  return loadAdminDetailPage(event, supabase, {
    table: 'lesson_comments',
    select: '*, users(name, email, avatar_url)',
    eq: { column: 'lesson_id', value: id },
    order: { column: 'created_at', ascending: false },
    logLabel: '[admin/lessons/[id]/comments.get]',
  })
})
