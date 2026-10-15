import { loadAdminArticles } from '../../utils/adminArticles'
import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseService()
  return loadAdminArticles(event, supabase)
})
