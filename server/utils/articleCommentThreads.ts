export const ARTICLE_COMMENT_ROOT_LIMIT = 20
export const ARTICLE_COMMENT_ROOT_MAX = 50
export const ARTICLE_COMMENT_REPLY_CAP_PER_ROOT = 50

export type CommentThreadRow = {
  id: string
  parent_id: string | null
  created_at: string
}

/** Keep at most `cap` replies per root (already ordered ascending by created_at). */
export function capRepliesPerRoot<T extends CommentThreadRow>(
  replies: readonly T[],
  cap = ARTICLE_COMMENT_REPLY_CAP_PER_ROOT,
): T[] {
  const limit = cap > 0 ? cap : ARTICLE_COMMENT_REPLY_CAP_PER_ROOT
  const counts = new Map<string, number>()
  const out: T[] = []
  for (const row of replies) {
    if (row.parent_id == null) continue
    const n = counts.get(row.parent_id) ?? 0
    if (n >= limit) continue
    counts.set(row.parent_id, n + 1)
    out.push(row)
  }
  return out
}

/** Newest-first roots → chronological roots + their replies (orphans dropped). */
export function mergeCommentThreads<T extends CommentThreadRow>(
  rootsNewestFirst: readonly T[],
  replies: readonly T[],
): T[] {
  const roots = [...rootsNewestFirst].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )
  const rootIds = new Set(roots.map((row) => row.id))
  const nested = replies
    .filter((row) => row.parent_id != null && rootIds.has(row.parent_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  return [...roots, ...nested]
}
