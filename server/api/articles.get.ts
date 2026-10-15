import { publicArticleList } from '../utils/articleList'
import { serverSupabaseService } from '../utils/supabaseServer'

export default defineEventHandler(async (_event) => {
  const supabase = serverSupabaseService()
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, body, tags, reading_time_minutes, image_url, created_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[articles.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  return publicArticleList(data ?? [])
})
