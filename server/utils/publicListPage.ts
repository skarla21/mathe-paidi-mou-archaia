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

export function publicPage(value: unknown): number {
  const raw = firstQuery(value).trim()
  if (!raw) return 1
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

/** Page size from `limit` or `pageSize`. Defaults to 20; hard-capped at 50. */
export function publicPageSize(
  value: unknown,
  fallback = PUBLIC_LIST_PAGE_SIZE,
): number {
  const raw = firstQuery(value).trim()
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), PUBLIC_LIST_MAX_PAGE_SIZE)
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
