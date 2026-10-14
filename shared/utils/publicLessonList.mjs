import { lessonExcerpt } from './lessonExcerpt.mjs'

export function publicLessonList(rows) {
  return (rows ?? []).flatMap((row) => {
    const nested = row?.lessons
    const lesson = Array.isArray(nested) ? nested[0] : nested
    if (!lesson || typeof lesson !== 'object') return []
    const rest = { ...lesson }
    const content = rest.content
    delete rest.content
    delete rest.content_url
    return [{
      ...rest,
      order: row.order,
      excerpt: lessonExcerpt(typeof content === 'string' ? content : ''),
    }]
  })
}
