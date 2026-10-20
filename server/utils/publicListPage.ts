/** Shared page clamp for public catalog / feed list endpoints. */

export const PUBLIC_LIST_PAGE_SIZE = 20
export const PUBLIC_LIST_MAX_PAGE_SIZE = 50

export type PublicListPage<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

function firstQuery(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (value == null) return ''
  return String(value)
}

function positiveIntQuery(value: unknown): number | null {
  const raw = firstQuery(value).trim()
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

export function publicPage(value: unknown): number {
  return positiveIntQuery(value) ?? 1
}

/** Page size from `limit` or `pageSize`. Defaults to 20; hard-capped at 50. */
export function publicPageSize(
  value: unknown,
  fallback = PUBLIC_LIST_PAGE_SIZE,
): number {
  const n = positiveIntQuery(value)
  if (n == null) return fallback
  return Math.min(n, PUBLIC_LIST_MAX_PAGE_SIZE)
}

export function publicPageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function publicListPage<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PublicListPage<T> {
  return { items, total, page, pageSize }
}
