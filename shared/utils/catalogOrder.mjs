export function sortChapters(chapters) {
  return [...(chapters ?? [])].sort((left, right) => {
    const byOrder = (left.order ?? 0) - (right.order ?? 0)
    if (byOrder) return byOrder
    return String(left.title ?? '').localeCompare(String(right.title ?? ''), 'el')
  })
}
