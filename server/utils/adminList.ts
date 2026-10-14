import { foldGreekSearch } from '#shared/utils/foldGreekSearch.mjs'
import type { AdminListPage } from '../../types/domain'

export const ADMIN_TABLE_PAGE_SIZE = 20

export function firstQuery(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (value == null) return ''
  return String(value)
}

export function adminPage(value: unknown): number {
  const raw = firstQuery(value).trim()
  if (!raw) return 1
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

export function pageRange(page: number, pageSize = ADMIN_TABLE_PAGE_SIZE) {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function sortAscending(value: unknown): boolean {
  return firstQuery(value) === 'asc'
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_*]/g, (ch: string) => `\\${ch}`)
}

function containsPattern(value: string): string {
  return `%${escapeLike(value)}%`
}

/** Typed contains pattern. Null when the text is blank. */
function rawContains(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return containsPattern(trimmed)
}

/** Folded contains pattern. Null when the text is blank or folds away. */
export function foldedContains(raw: string): string | null {
  const folded = foldGreekSearch(raw.trim())
  if (!folded) return null
  return containsPattern(folded)
}

function quoteFilterValue(pattern: string): string {
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** PostgREST `or` filter. Quoted so commas, dots, and quotes stay inside one value. */
export function orIlike(columns: string[], pattern: string): string {
  const quoted = quoteFilterValue(pattern)
  return columns.map((column) => `${column}.ilike.${quoted}`).join(',')
}

interface TextFilterColumn {
  column: string
  op: 'like' | 'ilike'
  pattern: string
}

function orText(columns: readonly TextFilterColumn[]): string {
  return columns
    .map(({ column, op, pattern }) => `${column}.${op}.${quoteFilterValue(pattern)}`)
    .join(',')
}

/** Folded name plus the typed email. Null only when the text is blank. */
export function userTextOr(raw: string): string | null {
  const email = rawContains(raw)
  if (!email) return null
  const name = foldedContains(raw)
  const columns: TextFilterColumn[] = []
  if (name) columns.push({ column: 'name_sort', op: 'like', pattern: name })
  columns.push({ column: 'email', op: 'ilike', pattern: email })
  return orText(columns)
}

/**
 * Contains filter for a stored folded column.
 * A query that folds away still filters on the typed text, which that column cannot contain.
 */
export function foldedTextOr(column: string, raw: string): string | null {
  const pattern = foldedContains(raw) ?? rawContains(raw)
  if (!pattern) return null
  return orText([{ column, op: 'like', pattern }])
}

export function adminListPage<T>(items: T[], total: number, page: number): AdminListPage<T> {
  return { items, total, page, pageSize: ADMIN_TABLE_PAGE_SIZE }
}
