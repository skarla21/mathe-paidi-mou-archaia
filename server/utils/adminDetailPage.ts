import { createError, getQuery, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminListPage, adminPage, pageRange } from './adminList'
import { requireAdmin } from './requireAdmin'

type OrderSpec = { column: string; ascending?: boolean }

/**
 * Paginated admin detail list (user/lesson/article nested tabs).
 * Call requireAdmin via this helper so every detail list stays gated.
 */
export async function loadAdminDetailPage(
  event: H3Event,
  supabase: SupabaseClient,
  opts: {
    table: string
    select: string
    eq: { column: string; value: string }
    order: OrderSpec
    logLabel: string
  },
) {
  requireAdmin(event)
  const page = adminPage(getQuery(event).page)
  const { from, to } = pageRange(page)

  const { data, error, count } = await supabase
    .from(opts.table)
    .select(opts.select, { count: 'exact' })
    .eq(opts.eq.column, opts.eq.value)
    .order(opts.order.column, { ascending: opts.order.ascending ?? false })
    .order('id', { ascending: true })
    .range(from, to)

  if (error) {
    console.error(opts.logLabel, error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  return adminListPage(data ?? [], count ?? 0, page)
}
