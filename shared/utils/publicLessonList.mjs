import { lessonExcerpt } from './lessonExcerpt.mjs'
import { publicLessonPreviewUrl } from './lessonPreviewUrl.mjs'

export function publicLessonList(rows, supabaseUrl) {
  return (rows ?? []).flatMap((row) => {
    const nested = row?.lessons
    const lesson = Array.isArray(nested) ? nested[0] : nested
    if (!lesson || typeof lesson !== 'object') return []
    const rest = { ...lesson }
    const content = rest.content
    const previewUrl = rest.preview_url
    delete rest.content
    delete rest.content_url
    return [{
      ...rest,
      preview_url: publicLessonPreviewUrl(previewUrl, supabaseUrl),
      order: row.order,
      excerpt: lessonExcerpt(typeof content === 'string' ? content : ''),
    }]
  })
}
