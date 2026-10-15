import { includesFolded } from '#shared/utils/foldGreekSearch.mjs'

export function articleMatchesQuery(
  article: { title: string, tags?: string[] | null, excerpt?: string | null },
  query: string,
): boolean {
  const q = query.trim()
  if (!q) return true
  return (
    includesFolded(article.title, q)
    || (article.tags ?? []).some((tag) => includesFolded(tag, q))
    || (article.excerpt ? includesFolded(article.excerpt, q) : false)
  )
}

export function filterArticlesByQuery<T extends {
  title: string
  tags?: string[] | null
  excerpt?: string | null
}>(rows: T[], query: string): T[] {
  const q = query.trim()
  if (!q) return rows
  return rows.filter((article) => articleMatchesQuery(article, q))
}
