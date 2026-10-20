import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const { isAdmin } = await readBody<{ isAdmin: boolean }>(event)
  if (typeof isAdmin !== 'boolean') throw createError({ statusCode: 400, message: 'isAdmin must be boolean' })
  const userId = event.context.auth?.userId
  if (id === userId && isAdmin === false) {
    throw createError({ statusCode: 400, message: 'Cannot revoke your own admin status' })
  }
  const supabase = serverSupabaseService()
  const { data, error } = await supabase
    .from('users')
    .update({ isAdmin })
    .eq('id', id)
    .select('id, email, name, avatar_url, "isAdmin", email_verified, provider, terms_accepted_at, created_at')
    .single()
  if (error) {
    console.error('[admin/users/[id].patch]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  return data
})
