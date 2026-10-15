import { lessonExcerpt } from '#shared/utils/lessonExcerpt.mjs'

export type ArticleListRow = {
  id: string
  title: string
  slug: string
  tags: string[]
  reading_time_minutes: number
  image_url?: string | null
  created_at: string
  body?: string | null
}

export type PublicArticleListItem = {
  id: string
  title: string
  slug: string
  tags: string[]
  reading_time_minutes: number
  image_url: string | null
  created_at: string
  excerpt: string
}

export function publicArticleList(rows: ArticleListRow[] | null | undefined): PublicArticleListItem[] {
  return (rows ?? []).map((row) => {
    const excerpt = lessonExcerpt(typeof row.body === 'string' ? row.body : '')
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      tags: Array.isArray(row.tags) ? row.tags : [],
      reading_time_minutes: row.reading_time_minutes,
      image_url: row.image_url ?? null,
      created_at: row.created_at,
      excerpt,
    }
  })
}
