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

/** LIKE pattern that contains the trimmed text. Null when the text is blank. */
export function ilikeContains(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  return `%${trimmed.replace(/[\\%_*]/g, (ch) => `\\${ch}`)}%`
}

/** PostgREST `or` filter. Quoted so commas, dots, and quotes stay inside one value. */
export function orIlike(columns: string[], pattern: string): string {
  const quoted = `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  return columns.map((column) => `${column}.ilike.${quoted}`).join(',')
}

export function adminListPage<T>(items: T[], total: number, page: number): AdminListPage<T> {
  return { items, total, page, pageSize: ADMIN_TABLE_PAGE_SIZE }
}
