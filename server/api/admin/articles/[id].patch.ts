import { serverSupabaseService } from '../../../utils/supabaseServer'
import { requireAdmin } from '../../../utils/requireAdmin'
import { normalizeArticleTags } from '../../../utils/articleTags'
import { readingTimeMinutesFromBody } from '../../../utils/readingTime'
import { listEntityImageUrls, releaseReplacedEntityImage } from '../../../utils/entityImageStorage'
import { storedEntityImageUrl } from '../../../utils/storedEntityImage'

const BODY_MAX = 500_000

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id parameter' })
  const body = await readBody<{
    title?: string
    body?: string
    tags?: unknown
    published?: boolean
    image_url?: string | null
  }>(event)

  const updates: Record<string, unknown> = {}
  const nextImageUrl = body.image_url !== undefined ? storedEntityImageUrl(body.image_url) : undefined
  if (body.title !== undefined) {
    const t = body.title.trim()
    if (!t) throw createError({ statusCode: 400, message: 'Title cannot be empty' })
    updates.title = t
  }
  if (body.body !== undefined) {
    if (body.body.length > BODY_MAX) throw createError({ statusCode: 400, message: 'Body is too long' })
    if (body.body.length < 1) throw createError({ statusCode: 400, message: 'Body cannot be empty' })
    updates.body = body.body
    updates.reading_time_minutes = readingTimeMinutesFromBody(body.body)
  }
  if (body.tags !== undefined) updates.tags = normalizeArticleTags(body.tags)
  if (body.published !== undefined) updates.published = Boolean(body.published)
  if (nextImageUrl !== undefined) updates.image_url = nextImageUrl

  if (!Object.keys(updates).length) throw createError({ statusCode: 400, message: 'Nothing to update' })

  const supabase = serverSupabaseService()
  let previousImageUrl: string | null = null
  if (body.image_url !== undefined) {
    const urls = await listEntityImageUrls(supabase, 'articles', 'id', id)
    if (!urls) throw createError({ statusCode: 500, message: 'Database operation failed' })
    previousImageUrl = urls[0] ?? null
  }
  const { data, error } = await supabase.from('articles').update(updates).eq('id', id).select().single()
  if (error) {
    console.error('[admin/articles/[id].patch]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  if (body.image_url !== undefined) {
    await releaseReplacedEntityImage(supabase, previousImageUrl, nextImageUrl)
  }
  return data
})
