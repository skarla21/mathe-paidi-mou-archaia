import { loadAdminDetailPage } from '../../../../utils/adminDetailPage'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const supabase = serverSupabaseService()
  return loadAdminDetailPage(event, supabase, {
    table: 'downloads',
    select: '*, lessons(title)',
    eq: { column: 'user_id', value: id },
    order: { column: 'downloaded_at', ascending: false },
    logLabel: '[admin/users/[id]/downloads.get]',
  })
})
