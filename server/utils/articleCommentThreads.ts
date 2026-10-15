export const ARTICLE_COMMENT_ROOT_LIMIT = 200

export type CommentThreadRow = {
  id: string
  parent_id: string | null
  created_at: string
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
