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
const PREFERENCE_COLUMNS =
  'notify_purchase, notify_download, notify_rating, notify_comment, notify_contact, notify_article_like, notify_article_comment'

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

async function allowedKindsForAdmin(
  supabase: SupabaseClient,
  userId: string,
  logLabel: string,
): Promise<AdminNotificationKind[]> {
  const { data, error } = await supabase
    .from('admin_notification_preferences')
    .select(PREFERENCE_COLUMNS)
    .eq('admin_user_id', userId)
    .maybeSingle()
  if (error) {
    console.error(logLabel, error.message)
    throw createError({ statusCode: 500, message: 'Failed to load notifications' })
  }
  return allowedKindsFromPrefs(data ?? DEFAULT_ADMIN_NOTIFICATION_PREFS)
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
  allowed: AdminNotificationKind[],
): Promise<number> {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .in('kind', allowed)
    .eq('read', false)

  if (error) {
    console.error('[admin/notifications.get] unread', error.message)
    throw createError({ statusCode: 500, message: 'Failed to load notifications' })
  }

  return count ?? 0
}

export async function loadAdminNotifications(event: H3Event, supabase: SupabaseClient) {
  const userId = requireAuth(event)
  requireAdmin(event)
  await cleanupOldAdminNotifications(supabase)

  const query = getQuery(event)
  const summary = firstQuery(query.summary) === '1'
  const pageSize = Math.min(20, Math.max(1, positiveInt(query.limit, 10)))
  const page = Math.max(1, positiveInt(query.page, 1))

  const allowed = await allowedKindsForAdmin(supabase, userId, '[admin/notifications.get] preferences')

  if (allowed.length === 0) {
    if (summary) return { unreadCount: 0 }
    return { items: [], unreadCount: 0, total: 0, page, pageSize }
  }

  const unreadCount = await countUnread(supabase, allowed)
  if (summary) return { unreadCount }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: rows, error, count } = await supabase
    .from('admin_notifications')
    .select('id, kind, payload, created_at, read', { count: 'exact' })
    .in('kind', allowed)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('[admin/notifications.get]', error.message)
    throw createError({ statusCode: 500, message: 'Failed to load notifications' })
  }

  const items = (rows ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as AdminNotificationKind,
    payload: row.payload as Record<string, unknown>,
    created_at: row.created_at,
    read: row.read === true,
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

export async function markAdminNotificationRead(event: H3Event, supabase: SupabaseClient) {
  requireAuth(event)
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id || !NOTIFICATION_ID.test(id)) {
    throw createError({ statusCode: 400, message: 'Missing id' })
  }

  const { error, count } = await supabase
    .from('admin_notifications')
    .update({ read: true, read_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', id)
    .eq('read', false)
  if (error) {
    console.error('[admin/notifications/read.post]', error.message)
    throw createError({ statusCode: 500, message: 'Failed to mark read' })
  }
  if (count) return { ok: true as const }

  const { data, error: lookupError } = await supabase
    .from('admin_notifications')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (lookupError) {
    console.error('[admin/notifications/read.post]', lookupError.message)
    throw createError({ statusCode: 500, message: 'Failed to mark read' })
  }
  if (!data) throw createError({ statusCode: 404, message: 'Notification not found' })
  return { ok: true as const }
}

export async function markAllAdminNotificationsRead(event: H3Event, supabase: SupabaseClient) {
  const userId = requireAuth(event)
  requireAdmin(event)
  const allowed = await allowedKindsForAdmin(
    supabase,
    userId,
    '[admin/notifications/read-all.post] preferences',
  )
  if (!allowed.length) return { ok: true as const }

  const { error } = await supabase
    .from('admin_notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .in('kind', allowed)
    .eq('read', false)
  if (error) {
    console.error('[admin/notifications/read-all.post]', error.message)
    throw createError({ statusCode: 500, message: 'Failed to mark all read' })
  }
  return { ok: true as const }
}
