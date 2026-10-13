import { loadAdminDownloads } from '../../utils/adminDownloads'
import { requireAdmin } from '../../utils/requireAdmin'
import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler((event) => {
  requireAdmin(event)
  return loadAdminDownloads(event, serverSupabaseService())
})
