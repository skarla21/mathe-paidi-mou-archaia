import { createError, getQuery, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DownloadWithJoins } from '../../types/domain'
import {
  adminListPage,
  adminPage,
  firstQuery,
  foldedTextOr,
  userTextOr,
  pageRange,
  sortAscending,
} from './adminList'
import { requireAdmin } from './requireAdmin'

const DOWNLOAD_SELECT = '*, users!inner(name, email), lessons!inner(title, is_free)'

type DownloadSort = 'user' | 'lesson' | 'time'

function downloadSort(value: unknown): DownloadSort {
  const raw = firstQuery(value)
  if (raw === 'user' || raw === 'lesson' || raw === 'time') return raw
  return 'time'
}

export async function loadAdminDownloads(event: H3Event, supabase: SupabaseClient) {
  requireAdmin(event)
  const query = getQuery(event)
  const page = adminPage(query.page)
  const sort = downloadSort(query.sort)
  const ascending = sortAscending(query.order)
  const user = userTextOr(firstQuery(query.user))
  const lesson = foldedTextOr('title_folded', firstQuery(query.lesson))
  const { from, to } = pageRange(page)

  let filtered = supabase
    .from('downloads')
    .select(DOWNLOAD_SELECT, { count: 'exact' })

  if (user) filtered = filtered.or(user, { referencedTable: 'users' })
  if (lesson) filtered = filtered.or(lesson, { referencedTable: 'lessons' })

  const ordered = sort === 'user'
    ? filtered.order('name_sort', { referencedTable: 'users', ascending })
    : sort === 'lesson'
      ? filtered.order('title_folded', { referencedTable: 'lessons', ascending })
      : filtered.order('downloaded_at', { ascending })

  const { data, error, count } = await ordered.order('id', { ascending: true }).range(from, to)
  if (error) {
    console.error('[admin/downloads.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  return adminListPage((data ?? []) as DownloadWithJoins[], count ?? 0, page)
}
