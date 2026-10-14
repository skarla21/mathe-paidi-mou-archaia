import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { listEntityImageUrls, releaseEntityImages } from '../../../utils/entityImageStorage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const supabase = serverSupabaseService()
  const imageUrls = await listEntityImageUrls(supabase, 'articles', 'id', id)
  if (!imageUrls) throw createError({ statusCode: 500, message: 'Database operation failed' })
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) {
    console.error('[admin/articles/[id].delete]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  await releaseEntityImages(supabase, imageUrls)
  return { ok: true }
})
