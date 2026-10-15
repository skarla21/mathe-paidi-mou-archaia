import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { normalizeArticleTags } from '../../utils/articleTags'
import { readingTimeMinutesFromBody } from '../../utils/readingTime'
import { storedEntityImageUrl } from '../../utils/storedEntityImage'
import { nextArticleSlug } from '../../utils/contentSlug'

const BODY_MAX = 500_000

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{
    title: string
    body: string
    tags?: unknown
    published?: boolean
    image_url?: string | null
  }>(event)

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) throw createError({ statusCode: 400, message: 'Title is required' })
  const mainBody = typeof body.body === 'string' ? body.body : ''
  if (mainBody.length < 1) throw createError({ statusCode: 400, message: 'Body is required' })
  if (mainBody.length > BODY_MAX) {
    throw createError({ statusCode: 400, message: 'Body is too long' })
  }

  const tags = normalizeArticleTags(body.tags)
  const reading_time_minutes = readingTimeMinutesFromBody(mainBody)
  const published = Boolean(body.published)

  const supabase = serverSupabaseService()
  const slug = await nextArticleSlug(supabase, title)
  const { data, error } = await supabase
    .from('articles')
    .insert({
      title,
      slug,
      body: mainBody,
      tags,
      reading_time_minutes,
      published,
      image_url: storedEntityImageUrl(body.image_url),
    })
    .select()
    .single()

  if (error) {
    console.error('[admin/articles.post]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  return data
})
