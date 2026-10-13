import { markAllAdminNotificationsRead } from '../../../utils/adminNotificationFeed'
import { serverSupabaseService } from '../../../utils/supabaseServer'

export default defineEventHandler((event) => {
  return markAllAdminNotificationsRead(event, serverSupabaseService())
})
