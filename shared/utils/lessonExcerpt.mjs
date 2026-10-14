const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

function fromCode(code) {
  if (!Number.isInteger(code) || code < 0 || code > 0x10FFFF) return ''
  if (code >= 0xD800 && code <= 0xDFFF) return ''
  return String.fromCodePoint(code)
}

function decodeEntity(body) {
  const lower = body.toLowerCase()
  if (Object.hasOwn(NAMED_ENTITIES, lower)) return NAMED_ENTITIES[lower]
  if (lower.startsWith('#x')) return fromCode(Number.parseInt(lower.slice(2), 16))
  if (lower.startsWith('#')) return fromCode(Number.parseInt(lower.slice(1), 10))
  return ''
}

export function lessonExcerpt(html, max = 160) {
  const limit = Number.isFinite(max) && max > 0 ? Math.floor(max) : 160
  const text = String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, body) => decodeEntity(body))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?…])/g, '$1')
    .trim()
  if (text.length <= limit) return text
  const window = text.slice(0, limit + 1)
  const space = window.lastIndexOf(' ')
  const cut = space > Math.floor(limit * 0.6) ? window.slice(0, space) : text.slice(0, limit)
  return `${cut.trimEnd()}…`
}
