import { loadAdminLessons } from '../../utils/adminLessons'
import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseService()
  return loadAdminLessons(event, supabase)
})
