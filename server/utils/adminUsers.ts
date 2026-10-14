import { createError, getQuery, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminListPage,
  adminPage,
  firstQuery,
  userTextOr,
  pageRange,
  sortAscending,
} from './adminList'
import { requireAdmin } from './requireAdmin'

const USER_SELECT = 'id, name, email, avatar_url, "isAdmin", created_at, download_count, purchase_count'

type UserSort = 'name' | 'joinedAt' | 'downloads' | 'purchases'

interface UserStatRow {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  isAdmin: boolean
  created_at: string
  download_count: number
  purchase_count: number
}

interface ArticleCountRow {
  id: string
  article_likes?: { count: number }[] | null
  article_comments?: { count: number }[] | null
}

function userSort(value: unknown): UserSort {
  const raw = firstQuery(value)
  if (raw === 'name' || raw === 'joinedAt' || raw === 'downloads' || raw === 'purchases') return raw
  return 'joinedAt'
}

function embedCount(value: { count: number }[] | null | undefined): number {
  return value?.[0]?.count ?? 0
}

async function articleCounts(supabase: SupabaseClient, ids: string[]) {
  const counts = new Map<string, { likes: number; comments: number }>()
  if (!ids.length) return counts
  const { data, error } = await supabase
    .from('users')
    .select('id, article_likes(count), article_comments(count)')
    .in('id', ids)
  if (error) {
    console.error('[admin/users.get] article counts', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  for (const row of (data ?? []) as ArticleCountRow[]) {
    counts.set(row.id, {
      likes: embedCount(row.article_likes),
      comments: embedCount(row.article_comments),
    })
  }
  return counts
}

export async function loadAdminUsers(event: H3Event, supabase: SupabaseClient) {
  requireAdmin(event)
  const query = getQuery(event)
  const page = adminPage(query.page)
  const sort = userSort(query.sort)
  const ascending = sortAscending(query.order)
  const search = userTextOr(firstQuery(query.q))
  const { from, to } = pageRange(page)

  let filtered = supabase
    .from('admin_user_stats')
    .select(USER_SELECT, { count: 'exact' })

  if (search) filtered = filtered.or(search)

  const ordered = sort === 'name'
    ? filtered.order('name_sort', { ascending })
    : sort === 'downloads'
      ? filtered.order('download_count', { ascending })
      : sort === 'purchases'
        ? filtered.order('purchase_count', { ascending })
        : filtered.order('created_at', { ascending })

  const { data, error, count } = await ordered.order('id', { ascending: true }).range(from, to)
  if (error) {
    console.error('[admin/users.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  const rows = (data ?? []) as UserStatRow[]
  const articles = await articleCounts(supabase, rows.map((row) => row.id))
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatar_url: row.avatar_url,
    isAdmin: row.isAdmin,
    created_at: row.created_at,
    downloadCount: row.download_count,
    purchaseCount: row.purchase_count,
    articleLikeCount: articles.get(row.id)?.likes ?? 0,
    articleCommentCount: articles.get(row.id)?.comments ?? 0,
  }))
  return adminListPage(items, count ?? 0, page)
}
