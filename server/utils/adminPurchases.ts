import { createError, getQuery, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PurchaseWithJoins } from '../../types/domain'
import {
  adminListPage,
  adminPage,
  firstQuery,
  ilikeContains,
  orIlike,
  pageRange,
} from './adminList'
import { requireAdmin } from './requireAdmin'

const PURCHASE_SELECT = '*, users!inner(name, email), lessons!inner(title)'

export async function loadAdminPurchases(event: H3Event, supabase: SupabaseClient) {
  requireAdmin(event)
  const query = getQuery(event)
  const page = adminPage(query.page)
  const user = ilikeContains(firstQuery(query.user))
  const lesson = ilikeContains(firstQuery(query.lesson))
  const { from, to } = pageRange(page)

  let filtered = supabase
    .from('purchases')
    .select(PURCHASE_SELECT, { count: 'exact' })

  if (user) filtered = filtered.or(orIlike(['name', 'email'], user), { referencedTable: 'users' })
  if (lesson) filtered = filtered.or(orIlike(['title'], lesson), { referencedTable: 'lessons' })

  const { data, error, count } = await filtered
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)
  if (error) {
    console.error('[admin/purchases.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  return adminListPage((data ?? []) as PurchaseWithJoins[], count ?? 0, page)
}
