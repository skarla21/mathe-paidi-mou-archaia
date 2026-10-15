import { createError, getQuery, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminListPage,
  adminPage,
  firstQuery,
  foldedTextOr,
  pageRange,
} from './adminList'
import { requireAdmin } from './requireAdmin'

function embedCount(value: { count: number }[] | null | undefined): number {
  return value?.[0]?.count ?? 0
}

export async function loadAdminArticles(event: H3Event, supabase: SupabaseClient) {
  requireAdmin(event)
  const query = getQuery(event)
  const page = adminPage(query.page)
  const q = firstQuery(query.q).trim()
  const { from, to } = pageRange(page)

  let filtered = supabase
    .from('articles')
    .select('*, article_likes(count), article_comments(count)', { count: 'exact' })

  if (q) {
    const parts = [
      foldedTextOr('title_folded', q),
      foldedTextOr('tags_folded', q),
    ].filter(Boolean)
    if (parts.length) filtered = filtered.or(parts.join(','))
  }

  const { data, error, count } = await filtered
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)

  if (error) {
    console.error('[admin/articles.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  const items = (data ?? []).map((row) => {
    const {
      article_likes: likes,
      article_comments: comments,
      ...article
    } = row as Record<string, unknown> & {
      article_likes?: { count: number }[] | null
      article_comments?: { count: number }[] | null
    }
    return {
      ...article,
      likeCount: embedCount(likes),
      commentCount: embedCount(comments),
    }
  })

  return adminListPage(items, count ?? 0, page)
}
