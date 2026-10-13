import { serverSupabaseService } from '../../utils/supabaseServer'
import { loadAdminPurchases } from '../../utils/adminPurchases'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler((event) => {
  requireAdmin(event)
  return loadAdminPurchases(event, serverSupabaseService())
})
