import { markAdminNotificationRead } from '../../../../utils/adminNotificationFeed'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler((event) => {
  return markAdminNotificationRead(event, serverSupabaseService())
})
