import { serverSupabaseService } from '../../utils/supabaseServer'
import { loadAdminUsers } from '../../utils/adminUsers'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler((event) => {
  requireAdmin(event)
  return loadAdminUsers(event, serverSupabaseService())
})
