import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  IMAGE_MIMES,
  LESSON_MIMES,
  maxBytesForMime,
} from '#shared/utils/uploadProgress.mjs'
// Node's test runner resolves this module only with the .ts extension.
// @ts-expect-error TS5097 Nuxt typecheck rejects that extension.
import { storedFileName } from './safeStorageName.ts'

export const UPLOAD_BUCKET = 'uploads'
const TICKET_TTL_MS = 2 * 60 * 60 * 1000
const FOLDERS = new Set(['lesson-content', 'entity-images'])
const IMAGE_ENTITIES = new Set(['category', 'chapter', 'subject', 'article'])

export type UploadTarget = 'lesson' | 'image'
export type UploadMime = 'application/pdf' | 'image/jpeg' | 'image/png'

export interface UploadTicket {
  path: string
  exp: number
  mime: string
  sig: string
}

export function isImageEntity(value: string): boolean {
  return IMAGE_ENTITIES.has(value)
}

export function isAllowedUploadMime(target: UploadTarget, mime: string): mime is UploadMime {
  const allowed = target === 'image' ? IMAGE_MIMES : LESSON_MIMES
  return (allowed as readonly string[]).includes(mime)
}

export function maxUploadBytes(mime: string): number {
  return maxBytesForMime(mime)
}

export function uploadObjectPath(
  target: UploadTarget,
  filename: string,
  mimeType: string,
  entity: string,
  suffix: string,
): string {
  const folder = target === 'image' ? 'entity-images' : 'lesson-content'
  const entityPrefix = entity.replace(/[\\/]/g, '').replace(/[^A-Za-z0-9-]/g, '') || 'item'
  const named = target === 'image' ? `${entityPrefix}-${filename}` : filename
  return `${folder}/${storedFileName(named, mimeType, suffix)}`
}

export function isUploadPath(path: string): boolean {
  if (!path || path.length > 300 || path.includes('\\') || path.includes('\0')) return false
  const parts = path.split('/')
  if (parts.length !== 2) return false
  const [folder, name] = parts
  if (!folder || !name || !FOLDERS.has(folder)) return false
  if (name === '.' || name === '..' || name.includes('..')) return false
  return true
}

export function mimeAllowedForPath(path: string, mime: string): boolean {
  if (!isUploadPath(path)) return false
  if (path.startsWith('entity-images/')) return (IMAGE_MIMES as readonly string[]).includes(mime)
  return (LESSON_MIMES as readonly string[]).includes(mime)
}

export function mimeFromMagic(bytes: Uint8Array): UploadMime | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-') {
    return 'application/pdf'
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg'
  if (
    bytes.length >= 4
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) return 'image/png'
  return null
}

export function uploadByteLength(
  status: number,
  contentRange: string | null,
  contentLength: string | null,
): number | null {
  const range = contentRange?.trim() ?? ''
  if (range) {
    const match = /\/(\d+)\s*$/.exec(range)
    if (!match) return null
    const size = Number(match[1])
    return Number.isSafeInteger(size) ? size : null
  }
  if (status === 200 && contentLength) {
    const size = Number(contentLength)
    return Number.isSafeInteger(size) ? size : null
  }
  return null
}

export function storageObjectUrl(supabaseUrl: string, path: string): string | null {
  if (!isUploadPath(path)) return null
  let base: URL
  try {
    base = new URL(supabaseUrl)
  } catch {
    return null
  }
  const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/')
  return new URL(`/storage/v1/object/${UPLOAD_BUCKET}/${encoded}`, base).toString()
}

export function signUploadTicket(path: string, secret: string, mime: string, now = Date.now()): UploadTicket {
  const exp = now + TICKET_TTL_MS
  return { path, exp, mime, sig: ticketSignature(path, exp, mime, secret) }
}

export function verifyUploadTicket(ticket: UploadTicket, secret: string, now = Date.now()): boolean {
  if (!secret || !isUploadPath(ticket.path)) return false
  if (typeof ticket.mime !== 'string' || !mimeAllowedForPath(ticket.path, ticket.mime)) return false
  if (!Number.isSafeInteger(ticket.exp) || ticket.exp <= now) return false
  if (typeof ticket.sig !== 'string' || ticket.sig.length === 0 || ticket.sig.length > 128) return false
  const expected = ticketSignature(ticket.path, ticket.exp, ticket.mime, secret)
  const left = Buffer.from(ticket.sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function uploadBytesMatchTicket(signedMime: string, detectedMime: string | null): boolean {
  return detectedMime !== null && detectedMime === signedMime
}

export async function readPrefixBytes(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  if (!body || limit <= 0) return new Uint8Array()
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let got = 0
  try {
    while (got < limit) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      got += value.byteLength
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const out = new Uint8Array(Math.min(got, limit))
  let offset = 0
  for (const chunk of chunks) {
    const take = Math.min(chunk.byteLength, out.byteLength - offset)
    if (take <= 0) break
    out.set(chunk.subarray(0, take), offset)
    offset += take
  }
  return out
}

function ticketSignature(path: string, exp: number, mime: string, secret: string): string {
  return createHmac('sha256', secret).update(`${path}.${exp}.${mime}`).digest('base64url')
}

export function isStorageNameTaken(error: { message?: string; status?: number; statusCode?: string | number }): boolean {
  const status = Number(error.status ?? error.statusCode)
  if (status === 409) return true
  return /already exists|duplicate/i.test(error.message ?? '')
}
