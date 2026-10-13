import { createError, getQuery, getRouterParam, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  cleanupOldAdminNotifications,
  DEFAULT_ADMIN_NOTIFICATION_PREFS,
  type AdminNotificationKind,
} from './adminNotifications'
import { requireAdmin } from './requireAdmin'
import { requireAuth } from './requireAuth'

const NOTIFICATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function allowedKindsFromPrefs(prefs: typeof DEFAULT_ADMIN_NOTIFICATION_PREFS): AdminNotificationKind[] {
  const out: AdminNotificationKind[] = []
  if (prefs.notify_purchase) out.push('purchase')
  if (prefs.notify_download) out.push('download')
  if (prefs.notify_rating) out.push('rating')
  if (prefs.notify_comment) out.push('comment')
  if (prefs.notify_contact) out.push('contact')
  if (prefs.notify_article_like) out.push('article_like')
  if (prefs.notify_article_comment) out.push('article_comment')
  return out
}

function firstQuery(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (value == null) return ''
  return String(value)
}

function positiveInt(value: unknown, fallback: number): number {
  const raw = firstQuery(value)
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  return Math.floor(n)
}

async function countUnread(
  supabase: SupabaseClient,
  userId: string,
  allowed: AdminNotificationKind[],
): Promise<number> {
  const { count: total, error: totalError } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .in('kind', allowed)

  if (totalError) {
    console.error('[admin/notifications.get] total', totalError.message)
    throw createError({ statusCode: 500, message: 'Failed to load notifications' })
  }

  const { count: readCount, error: readError } = await supabase
    .from('admin_notification_reads')
    .select('notification_id, admin_notifications!inner(kind)', { count: 'exact', head: true })
    .eq('admin_user_id', userId)
    .in('admin_notifications.kind', allowed)

  if (readError) {
    console.error('[admin/notifications.get] unread', readError.message)
    throw createError({ statusCode: 500, message: 'Failed to load notifications' })
  }

  return Math.max(0, (total ?? 0) - (readCount ?? 0))
}

export async function loadAdminNotifications(event: H3Event, supabase: SupabaseClient) {
  const userId = requireAuth(event)
  requireAdmin(event)
  await cleanupOldAdminNotifications(supabase)

  const query = getQuery(event)
  const summary = firstQuery(query.summary) === '1'
  const pageSize = Math.min(20, Math.max(1, positiveInt(query.limit, 10)))
  const page = Math.max(1, positiveInt(query.page, 1))

  const { data: prefRow } = await supabase
    .from('admin_notification_preferences')
    .select(
      'notify_purchase, notify_download, notify_rating, notify_comment, notify_contact, notify_article_like, notify_article_comment',
    )
    .eq('admin_user_id', userId)
    .maybeSingle()

  const prefs = prefRow ?? DEFAULT_ADMIN_NOTIFICATION_PREFS
  const allowed = allowedKindsFromPrefs(prefs)

  if (allowed.length === 0) {
    if (summary) return { unreadCount: 0 }
    return { items: [], unreadCount: 0, total: 0, page, pageSize }
  }

  const unreadCount = await countUnread(supabase, userId, allowed)
  if (summary) return { unreadCount }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: rows, error, count } = await supabase
    .from('admin_notifications')
    .select('id, kind, payload, created_at', { count: 'exact' })
    .in('kind', allowed)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[admin/notifications.get]', error.message)
    throw createError({ statusCode: 500, message: 'Failed to load notifications' })
  }

  const listIds = (rows ?? []).map((row) => row.id)
  let readSet = new Set<string>()
  if (listIds.length) {
    const { data: reads, error: readsError } = await supabase
      .from('admin_notification_reads')
      .select('notification_id')
      .eq('admin_user_id', userId)
      .in('notification_id', listIds)
    if (readsError) {
      console.error('[admin/notifications.get] reads', readsError.message)
      throw createError({ statusCode: 500, message: 'Failed to load notifications' })
    }
    readSet = new Set((reads ?? []).map((row) => row.notification_id))
  }

  const items = (rows ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as AdminNotificationKind,
    payload: row.payload as Record<string, unknown>,
    created_at: row.created_at,
    read: readSet.has(row.id),
  }))

  return { items, unreadCount, total: count ?? 0, page, pageSize }
}

export async function deleteAdminNotification(event: H3Event, supabase: SupabaseClient) {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !NOTIFICATION_ID.test(id)) {
    throw createError({ statusCode: 400, message: 'Missing id' })
  }

  const { error, count } = await supabase
    .from('admin_notifications')
    .delete({ count: 'exact' })
    .eq('id', id)
  if (error) {
    console.error('[admin/notifications/delete]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  if (!count) throw createError({ statusCode: 404, message: 'Notification not found' })
  return { ok: true as const }
}
