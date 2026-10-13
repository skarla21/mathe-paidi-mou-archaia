const PREVIEW_MARKER = '/storage/v1/object/public/uploads/lesson-content/'

export const LESSON_IMAGE_PREVIEW_WIDTH = 400
export const LESSON_IMAGE_PREVIEW_QUALITY = 50

export function lessonImagePreviewUrl(url, options = {}) {
  const value = typeof url === 'string' ? url.trim() : ''
  if (!value) return ''
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return value
  }
  const markerAt = parsed.pathname.indexOf(PREVIEW_MARKER)
  if (markerAt !== 0) return value
  if (!/\.(jpe?g|png)$/i.test(parsed.pathname)) return value
  let path
  try {
    path = decodeURIComponent(parsed.pathname.slice(PREVIEW_MARKER.length))
  } catch {
    return value
  }
  const parts = path.split('/')
  if (!path || path.includes('\\') || parts.some((part) => part === '' || part === '.' || part === '..')) {
    return value
  }
  const width = options.width ?? LESSON_IMAGE_PREVIEW_WIDTH
  const quality = options.quality ?? LESSON_IMAGE_PREVIEW_QUALITY
  const encoded = parts.map((part) => encodeURIComponent(part)).join('/')
  return `${parsed.origin}/storage/v1/render/image/public/uploads/lesson-content/${encoded}?width=${width}&quality=${quality}&resize=contain`
}

export function lessonDownloadName(title, src) {
  const path = String(src || '').split('?')[0]
  const match = path.match(/\.([a-z0-9]+)$/i)
  const ext = (match?.[1] || 'pdf').toLowerCase()
  const base = String(title || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'yliko'
  return `${base}.${ext}`
}

export function lessonPageCountLabel(count) {
  return count === 1 ? '1 σελίδα' : `${count} σελίδες`
}

export function strongestVisiblePage(ratios) {
  let bestPage = 0
  let bestRatio = 0
  for (const [page, ratio] of ratios) {
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestPage = page
    }
  }
  return bestPage
}

export function lessonFileSizeLabel(bytes) {
  const size = Number(bytes)
  if (!Number.isFinite(size) || size <= 0) return ''
  const mb = size / (1024 * 1024)
  if (mb < 0.1) return `${mb.toFixed(2).replace('.', ',')} MB`
  if (mb < 10) return `${mb.toFixed(1).replace('.', ',')} MB`
  return `${Math.round(mb)} MB`
}

export function contentLengthFromHeaders(contentLength, contentRange) {
  const rangeTotal = String(contentRange || '').match(/\/(\d+)\s*$/)
  if (rangeTotal) {
    const total = Number(rangeTotal[1])
    if (total > 0) return total
  }
  const length = Number(contentLength)
  return Number.isFinite(length) && length > 0 ? length : 0
}
