import type { SupabaseClient } from '@supabase/supabase-js'
import { classifyEntityImageUrl } from '#shared/utils/entityImageUrl.mjs'
import { LESSON_CONTENT_REAP_AGE_MS } from './lessonStorage'

const BUCKET = 'uploads'
const IMAGE_PREFIX = 'entity-images/'
const IMAGE_FOLDER = 'entity-images'
const PAGE_SIZE = 1000
const IMAGE_TABLES = ['categories', 'chapters', 'subjects'] as const

type ImageRow = { image_url?: string | null }
type StoredObject = {
  name?: string | null
  id?: string | null
  created_at?: string | null
}
type ClassifiedUrl =
  | { kind: 'ignore' }
  | { kind: 'block' }
  | { kind: 'path'; path: string }

function classify(url: string, supabaseUrl: string): ClassifiedUrl {
  return classifyEntityImageUrl(url, supabaseUrl) as ClassifiedUrl
}

export function entityImagePathFromUrl(url: string, supabaseUrl: string): string | null {
  const classified = classify(url, supabaseUrl)
  return classified.kind === 'path' ? classified.path : null
}

async function referencedEntityImagePaths(
  supabase: SupabaseClient,
  supabaseUrl: string,
): Promise<Set<string> | null> {
  const paths = new Set<string>()
  for (const table of IMAGE_TABLES) {
    let from = 0
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select('image_url')
        .not('image_url', 'is', null)
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) {
        console.error('[entityImageStorage] list image_url', error.message)
        return null
      }
      const rows = (data ?? []) as ImageRow[]
      for (const row of rows) {
        if (!row.image_url) continue
        const classified = classify(row.image_url, supabaseUrl)
        if (classified.kind === 'block') {
          console.error('[entityImageStorage] unrecognized image url')
          return null
        }
        if (classified.kind === 'path') paths.add(classified.path)
      }
      if (rows.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }
  return paths
}

function entityObjectPath(name: string | null | undefined): string | null {
  if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') return null
  return `${IMAGE_PREFIX}${name}`
}

function isStaleObject(createdAt: string | null | undefined, now: number): boolean {
  if (!createdAt) return false
  const created = Date.parse(createdAt)
  if (Number.isNaN(created)) return false
  return created <= now - LESSON_CONTENT_REAP_AGE_MS
}

export async function removeUnusedEntityImagePath(
  supabase: SupabaseClient,
  path: string,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<void> {
  if (!path.startsWith(IMAGE_PREFIX)) return
  const referenced = await referencedEntityImagePaths(supabase, supabaseUrl)
  if (!referenced || referenced.has(path)) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('[entityImageStorage] remove', error.message)
}

export async function removeUnusedEntityImage(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<void> {
  if (!imageUrl) return
  const classified = classify(imageUrl, supabaseUrl)
  if (classified.kind !== 'path') {
    if (classified.kind === 'ignore') console.warn('[entityImageStorage] skip unrecognized image url')
    return
  }
  await removeUnusedEntityImagePath(supabase, classified.path, supabaseUrl)
}

async function removeEntityImage(
  supabase: SupabaseClient,
  imageUrl: string,
  supabaseUrl?: string,
): Promise<void> {
  if (supabaseUrl === undefined) {
    await removeUnusedEntityImage(supabase, imageUrl)
    return
  }
  await removeUnusedEntityImage(supabase, imageUrl, supabaseUrl)
}

export async function releaseReplacedEntityImage(
  supabase: SupabaseClient,
  previousUrl: string | null | undefined,
  nextUrl: string | null | undefined,
  supabaseUrl?: string,
): Promise<void> {
  const previous = previousUrl || null
  const next = nextUrl || null
  if (!previous || previous === next) return
  await removeEntityImage(supabase, previous, supabaseUrl)
}

export async function releaseEntityImages(
  supabase: SupabaseClient,
  urls: Array<string | null | undefined>,
  supabaseUrl?: string,
): Promise<void> {
  const unique: string[] = []
  for (const url of urls) {
    if (!url || unique.includes(url)) continue
    unique.push(url)
  }
  for (const url of unique) await removeEntityImage(supabase, url, supabaseUrl)
}

export async function listEntityImageUrls(
  supabase: SupabaseClient,
  table: (typeof IMAGE_TABLES)[number],
  column: 'id' | 'subject_id' | 'grade_id',
  value: string,
): Promise<string[] | null> {
  const urls: string[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('image_url')
      .eq(column, value)
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('[entityImageStorage] list image_url', error.message)
      return null
    }
    const rows = (data ?? []) as ImageRow[]
    for (const row of rows) {
      if (row.image_url) urls.push(row.image_url)
    }
    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return urls
}

export async function reapOrphanEntityImages(
  supabase: SupabaseClient,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
  now = Date.now(),
): Promise<void> {
  const referenced = await referencedEntityImagePaths(supabase, supabaseUrl)
  if (!referenced) return

  const stale: string[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(IMAGE_FOLDER, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      console.error('[entityImageStorage] list entity-images', error.message)
      return
    }
    const objects = (data ?? []) as StoredObject[]
    for (const object of objects) {
      const path = entityObjectPath(object.name)
      if (!path || !object.id || referenced.has(path) || !isStaleObject(object.created_at, now)) continue
      stale.push(path)
    }
    if (objects.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  for (let index = 0; index < stale.length; index += 100) {
    const batch = stale.slice(index, index + 100)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) console.error('[entityImageStorage] reap', error.message)
  }
}
