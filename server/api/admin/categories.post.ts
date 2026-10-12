import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { nextCategorySlug } from '../../utils/contentSlug'
import { withUniqueSlugRetry } from '../../utils/uniqueViolation'
import { storedEntityImageUrl } from '../../utils/storedEntityImage'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ name: string; description?: string; image_url?: string; order?: number }>(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, message: 'Το όνομα είναι υποχρεωτικό' })
  const supabase = serverSupabaseService()
  const name = body.name.trim()
  const { data, error } = await withUniqueSlugRetry(3, async () => {
    const slug = await nextCategorySlug(supabase, name)
    return supabase.from('categories').insert({
      name,
      slug,
      description: body.description ?? null,
      image_url: storedEntityImageUrl(body.image_url),
      order: body.order ?? 0,
    }).select().single()
  })
  if (error || !data) {
    console.error('[admin/categories.post]', error?.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  return data
})
