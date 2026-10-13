import { loadAdminNotifications } from '../../utils/adminNotificationFeed'
import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler((event) => {
  return loadAdminNotifications(event, serverSupabaseService())
})
