import type { SupabaseClient } from '@supabase/supabase-js'
import { acceptedEntityImageUrl, classifyEntityImageUrl } from '#shared/utils/entityImageUrl.mjs'
import { LESSON_CONTENT_REAP_AGE_MS } from './lessonStorage'

const BUCKET = 'uploads'
const IMAGE_PREFIX = 'entity-images/'
const IMAGE_FOLDER = 'entity-images'
const PAGE_SIZE = 1000
const IMAGE_TABLES = ['categories', 'chapters', 'subjects', 'articles'] as const
const IMAGE_KIND = {
  categories: 'category',
  chapters: 'chapter',
  subjects: 'subject',
  articles: 'article',
} as const
const KIND_ORDER = { subject: 0, chapter: 1, category: 2, article: 3 } as const

export type EntityImageKind = (typeof IMAGE_KIND)[keyof typeof IMAGE_KIND]
type ImageUse = { type: EntityImageKind; id: string; label: string }
type ImageGroup = { url: string; usedBy: ImageUse[] }

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

function imageText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function joinImageLabel(parts: string[]): string {
  return parts.filter(Boolean).join(' > ')
}

function relatedImageRecord(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  return row as Record<string, unknown>
}

function relatedImageName(value: unknown): string {
  return imageText(relatedImageRecord(value)?.name)
}

function imageLabel(table: (typeof IMAGE_TABLES)[number], row: Record<string, unknown>): string {
  if (table === 'categories') return imageText(row.name)
  if (table === 'articles') return imageText(row.title)
  if (table === 'subjects') return joinImageLabel([relatedImageName(row.grades), imageText(row.name)])
  const subject = relatedImageRecord(row.subjects)
  return joinImageLabel([
    relatedImageName(subject?.grades),
    imageText(subject?.name),
    imageText(row.title),
  ])
}

type ImagePage = { data: unknown; error: { message: string } | null }

async function pageImageRows(
  load: (from: number, to: number) => PromiseLike<ImagePage>,
): Promise<Record<string, unknown>[] | null> {
  const rows: Record<string, unknown>[] = []
  let from = 0
  for (;;) {
    const { data, error } = await load(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('[entityImageStorage] list image_url', error.message)
      return null
    }
    const page = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

function listImageRows(
  supabase: SupabaseClient,
  table: (typeof IMAGE_TABLES)[number],
): Promise<Record<string, unknown>[] | null> {
  if (table === 'categories') {
    return pageImageRows((from, to) => supabase
      .from('categories')
      .select('id, name, image_url')
      .not('image_url', 'is', null)
      .order('id')
      .range(from, to))
  }
  if (table === 'chapters') {
    return pageImageRows((from, to) => supabase
      .from('chapters')
      .select('id, title, image_url, subjects(name, grades(name))')
      .not('image_url', 'is', null)
      .order('id')
      .range(from, to))
  }
  if (table === 'articles') {
    return pageImageRows((from, to) => supabase
      .from('articles')
      .select('id, title, image_url')
      .not('image_url', 'is', null)
      .order('id')
      .range(from, to))
  }
  return pageImageRows((from, to) => supabase
    .from('subjects')
    .select('id, name, image_url, grades(name)')
    .not('image_url', 'is', null)
    .order('id')
    .range(from, to))
}

function addReferencedImage(
  groups: Map<string, ImageGroup>,
  table: (typeof IMAGE_TABLES)[number],
  row: Record<string, unknown>,
  supabaseUrl: string,
) {
  const id = imageText(row.id)
  const rawUrl = imageText(row.image_url)
  if (!id || !rawUrl) return
  const url = acceptedEntityImageUrl(rawUrl, supabaseUrl)
  if (typeof url !== 'string') return
  const path = entityImagePathFromUrl(url, supabaseUrl)
  if (!path) return
  const kind = IMAGE_KIND[table]
  const group = groups.get(path) ?? { url, usedBy: [] }
  if (!groups.has(path)) groups.set(path, group)
  if (group.usedBy.some(use => use.type === kind && use.id === id)) return
  group.usedBy.push({ type: kind, id, label: imageLabel(table, row) })
}

export async function listReferencedEntityImages(
  supabase: SupabaseClient,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
  except: { type: EntityImageKind; id: string } | null = null,
): Promise<ImageGroup[] | null> {
  const groups = new Map<string, ImageGroup>()
  for (const table of IMAGE_TABLES) {
    const rows = await listImageRows(supabase, table)
    if (!rows) return null
    for (const row of rows) addReferencedImage(groups, table, row, supabaseUrl)
  }
  const images = [...groups.values()]
    .map(image => ({
      url: image.url,
      usedBy: image.usedBy.filter(use => !except || use.type !== except.type || use.id !== except.id),
    }))
    .filter(image => image.usedBy.length > 0)
  for (const image of images) {
    image.usedBy.sort((a, b) => (
      KIND_ORDER[a.type] - KIND_ORDER[b.type]
      || a.label.localeCompare(b.label, 'el')
      || a.id.localeCompare(b.id)
    ))
  }
  images.sort((a, b) => {
    const left = a.usedBy[0]?.label ?? ''
    const right = b.usedBy[0]?.label ?? ''
    return left.localeCompare(right, 'el') || a.url.localeCompare(b.url)
  })
  return images
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
