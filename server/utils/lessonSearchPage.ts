import { lessonExcerpt } from '#shared/utils/lessonExcerpt.mjs'
import { publicLessonPreviewUrl } from '#shared/utils/lessonPreviewUrl.mjs'

export const LESSON_SEARCH_PAGE_SIZE = 20
/** Max title matches fetched before path-filter + in-memory pagination. */
export const LESSON_SEARCH_FETCH_CAP = 500

export type LessonSearchItem = {
  id: string
  title: string
  url: string
  excerpt: string
  tags: string[]
  is_free: boolean
  preview_url: string | null
  page_count: number | null
  file_bytes: number | null
  bookmarked: boolean
  avg_rating: number
  rating_count: number
}

export type LessonSearchPage = {
  items: LessonSearchItem[]
  total: number
  page: number
  pageSize: number
}

export function emptyLessonSearchPage(page = 1): LessonSearchPage {
  return {
    items: [],
    total: 0,
    page: Math.max(1, Math.floor(page) || 1),
    pageSize: LESSON_SEARCH_PAGE_SIZE,
  }
}

export function mapLessonSearchRows(
  rows: readonly {
    id: string
    title: string
    is_free: boolean
    content?: string | null
    tags?: string[] | null
    preview_url?: string | null
    page_count?: number | null
    file_bytes?: number | null
    avg_rating?: number | null
    rating_count?: number | null
  }[],
  lessonPaths: ReadonlyMap<string, string>,
  supabaseUrl = '',
): LessonSearchItem[] {
  const items: LessonSearchItem[] = []
  for (const row of rows) {
    const url = lessonPaths.get(row.id)
    if (!url) continue
    items.push({
      id: row.id,
      title: row.title,
      url,
      excerpt: lessonExcerpt(typeof row.content === 'string' ? row.content : ''),
      tags: Array.isArray(row.tags) ? row.tags : [],
      is_free: row.is_free,
      preview_url: publicLessonPreviewUrl(row.preview_url, supabaseUrl),
      page_count: row.page_count ?? null,
      file_bytes: row.file_bytes ?? null,
      bookmarked: false,
      avg_rating: Number(row.avg_rating ?? 0),
      rating_count: Number(row.rating_count ?? 0),
    })
  }
  return items
}

export function withLessonSearchBookmarks(
  items: readonly LessonSearchItem[],
  bookmarkedIds: ReadonlySet<string>,
): LessonSearchItem[] {
  if (!bookmarkedIds.size) {
    return items.map((item) => ({ ...item, bookmarked: false }))
  }
  return items.map((item) => ({
    ...item,
    bookmarked: bookmarkedIds.has(item.id),
  }))
}

/** Paginate path-resolved items so `total` matches what users can open. */
export function paginateLessonSearchItems(
  items: readonly LessonSearchItem[],
  page: number,
  pageSize = LESSON_SEARCH_PAGE_SIZE,
): LessonSearchPage {
  const safePage = Math.max(1, Math.floor(page) || 1)
  const size = pageSize > 0 ? pageSize : LESSON_SEARCH_PAGE_SIZE
  const from = (safePage - 1) * size
  return {
    items: items.slice(from, from + size),
    total: items.length,
    page: safePage,
    pageSize: size,
  }
}
