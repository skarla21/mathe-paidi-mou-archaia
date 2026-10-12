import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { listEntityImageUrls, releaseReplacedEntityImage } from '../../../utils/entityImageStorage'
import { storedEntityImageUrl } from '../../../utils/storedEntityImage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })
  const body = await readBody<{ name?: string; description?: string; image_url?: string; order?: number }>(event)
  const updates: Record<string, unknown> = {}
  const supabase = serverSupabaseService()
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description || null
  const nextImageUrl = body.image_url !== undefined ? storedEntityImageUrl(body.image_url) : undefined
  if (nextImageUrl !== undefined) updates.image_url = nextImageUrl
  if (body.order !== undefined) updates.order = body.order
  if (!Object.keys(updates).length) throw createError({ statusCode: 400, message: 'Δεν υπάρχει κάτι για ενημέρωση' })
  let previousImageUrl: string | null = null
  if (body.image_url !== undefined) {
    const urls = await listEntityImageUrls(supabase, 'categories', 'id', id)
    if (!urls) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    previousImageUrl = urls[0] ?? null
  }
  const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single()
  if (error) {
    console.error('[admin/categories/[id].patch]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  if (body.image_url !== undefined) {
    await releaseReplacedEntityImage(supabase, previousImageUrl, nextImageUrl)
  }
  return data
})
