import { deleteAdminNotification } from '../../../utils/adminNotificationFeed'
import { serverSupabaseService } from '../../../utils/supabaseServer'

export default defineEventHandler((event) => {
  return deleteAdminNotification(event, serverSupabaseService())
})
