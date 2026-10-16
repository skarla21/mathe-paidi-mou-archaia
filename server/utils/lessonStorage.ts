import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'uploads'
/** Private bucket. content_url stores the object path inside this bucket. */
export const LESSON_FILES_BUCKET = 'lesson-files'
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`
const LESSON_PREFIX = 'lesson-content/'
const PREVIEW_PREFIX = 'lesson-previews/'

export function lessonContentPathFromUrl(url: string, supabaseUrl: string): string | null {
  if (!url) return null
  const value = url.trim()
  if (!value.includes('://')) return bareLessonContentPath(value)
  return storagePathFromUrl(value, supabaseUrl, LESSON_PREFIX)
}

function bareLessonContentPath(path: string): string | null {
  if (!path.startsWith(LESSON_PREFIX) || path.includes('\\') || path.includes('?') || path.includes('#')) {
    return null
  }
  let decoded = path
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return null
  }
  const parts = decoded.split('/')
  if (parts.length !== 2 || parts.some((part) => part === '' || part === '.' || part === '..')) return null
  if (!decoded.startsWith(LESSON_PREFIX)) return null
  return decoded
}

export function lessonPreviewPathFromUrl(url: string, supabaseUrl: string): string | null {
  return storagePathFromUrl(url, supabaseUrl, PREVIEW_PREFIX)
}

function storagePathFromUrl(url: string, supabaseUrl: string, prefix: string): string | null {
  if (!url || !supabaseUrl) return null
  let parsed: URL
  let base: URL
  try {
    parsed = new URL(url)
    base = new URL(supabaseUrl)
  } catch {
    return null
  }
  if (parsed.origin !== base.origin) return null
  const idx = parsed.pathname.indexOf(PUBLIC_PREFIX)
  if (idx === -1) return null
  let path: string
  try {
    path = decodeURIComponent(parsed.pathname.slice(idx + PUBLIC_PREFIX.length))
  } catch {
    return null
  }
  if (!path.startsWith(prefix) || path.includes('\\')) return null
  const parts = path.split('/')
  if (parts.some((part) => part === '' || part === '.' || part === '..')) return null
  return path
}

const PAGE_SIZE = 1000
const LESSON_FOLDER = 'lesson-content'
const PREVIEW_FOLDER = 'lesson-previews'
export const LESSON_CONTENT_REAP_AGE_MS = 15 * 60 * 1000

type LessonContentRow = { content_url?: string | null }
type LessonPreviewRow = { preview_url?: string | null }
type StoredObject = {
  name?: string | null
  id?: string | null
  created_at?: string | null
}

async function referencedLessonContentPaths(
  supabase: SupabaseClient,
  supabaseUrl: string,
): Promise<Set<string> | null> {
  const paths = new Set<string>()
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('lessons')
      .select('content_url')
      .not('content_url', 'is', null)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('[lessonStorage] list content_url', error.message)
      return null
    }
    const rows = (data ?? []) as LessonContentRow[]
    for (const row of rows) {
      if (!row.content_url) continue
      const path = lessonContentPathFromUrl(row.content_url, supabaseUrl)
      if (!path) {
        console.error('[lessonStorage] unrecognized content url')
        return null
      }
      paths.add(path)
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return paths
}

async function referencedLessonPreviewPaths(
  supabase: SupabaseClient,
  supabaseUrl: string,
): Promise<Set<string> | null> {
  const paths = new Set<string>()
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('lessons')
      .select('preview_url')
      .not('preview_url', 'is', null)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('[lessonStorage] list preview_url', error.message)
      return null
    }
    const rows = (data ?? []) as LessonPreviewRow[]
    for (const row of rows) {
      if (!row.preview_url) continue
      const path = lessonPreviewPathFromUrl(row.preview_url, supabaseUrl)
      if (!path) {
        console.error('[lessonStorage] unrecognized preview url')
        return null
      }
      paths.add(path)
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return paths
}

function folderObjectPath(folderPrefix: string, name: string | null | undefined): string | null {
  if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') return null
  return `${folderPrefix}${name}`
}

function isStaleObject(createdAt: string | null | undefined, now: number): boolean {
  if (!createdAt) return false
  const created = Date.parse(createdAt)
  if (Number.isNaN(created)) return false
  return created <= now - LESSON_CONTENT_REAP_AGE_MS
}

export async function removeUnusedLessonContent(
  supabase: SupabaseClient,
  contentUrl: string | null | undefined,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<void> {
  if (!contentUrl) return
  const path = lessonContentPathFromUrl(contentUrl, supabaseUrl)
  if (!path) {
    console.warn('[lessonStorage] skip unrecognized content url')
    return
  }

  await removeUnusedLessonPath(supabase, path, supabaseUrl)
}

export async function removeUnusedLessonPreview(
  supabase: SupabaseClient,
  previewUrl: string | null | undefined,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<void> {
  if (!previewUrl) return
  const path = lessonPreviewPathFromUrl(previewUrl, supabaseUrl)
  if (!path) {
    console.warn('[lessonStorage] skip unrecognized preview url')
    return
  }

  await removeUnusedLessonPreviewPath(supabase, path, supabaseUrl)
}

export async function removeUnusedLessonPath(
  supabase: SupabaseClient,
  path: string,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<void> {
  if (!path.startsWith(LESSON_PREFIX)) return
  const referenced = await referencedLessonContentPaths(supabase, supabaseUrl)
  if (!referenced || referenced.has(path)) return

  const { error } = await supabase.storage.from(LESSON_FILES_BUCKET).remove([path])
  if (error) console.error('[lessonStorage] remove', error.message)
}

export async function removeUnusedLessonPreviewPath(
  supabase: SupabaseClient,
  path: string,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<void> {
  if (!path.startsWith(PREVIEW_PREFIX)) return
  const referenced = await referencedLessonPreviewPaths(supabase, supabaseUrl)
  if (!referenced || referenced.has(path)) return

  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('[lessonStorage] remove preview', error.message)
}

async function reapFolder(
  supabase: SupabaseClient,
  bucket: string,
  folder: string,
  folderPrefix: string,
  referenced: Set<string>,
  now: number,
): Promise<void> {
  const stale: string[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      console.error(`[lessonStorage] list ${folder}`, error.message)
      return
    }
    const objects = (data ?? []) as StoredObject[]
    for (const object of objects) {
      const path = folderObjectPath(folderPrefix, object.name)
      if (!path || !object.id || referenced.has(path) || !isStaleObject(object.created_at, now)) continue
      stale.push(path)
    }
    if (objects.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  for (let index = 0; index < stale.length; index += 100) {
    const batch = stale.slice(index, index + 100)
    const { error } = await supabase.storage.from(bucket).remove(batch)
    if (error) console.error(`[lessonStorage] reap ${bucket}/${folder}`, error.message)
  }
}

export async function reapOrphanLessonContent(
  supabase: SupabaseClient,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
  now = Date.now(),
): Promise<void> {
  const referenced = await referencedLessonContentPaths(supabase, supabaseUrl)
  if (!referenced) return
  await reapFolder(supabase, LESSON_FILES_BUCKET, LESSON_FOLDER, LESSON_PREFIX, referenced, now)
}

export async function reapOrphanLessonPreviews(
  supabase: SupabaseClient,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
  now = Date.now(),
): Promise<void> {
  const referenced = await referencedLessonPreviewPaths(supabase, supabaseUrl)
  if (!referenced) return
  await reapFolder(supabase, BUCKET, PREVIEW_FOLDER, PREVIEW_PREFIX, referenced, now)
}
