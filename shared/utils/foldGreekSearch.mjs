/** Plain-Greek search key. Keep in step with public.fold_greek_search in supabase/schema.sql. */
const YPOGEGRAMMENI = /[\u0345\u037A]/g
const SPACING_MARKS = /[\u0060\u00A8\u00B4\u0384\u1FBD\u1FBF\u1FC0\u1FFE]/g
const POSTGREST_RESERVED = /[,.:()"]/
const INVISIBLE = new Set([0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF])
const UNICODE_SPACES = new Set([
  0x0009, 0x000A, 0x000B, 0x000C, 0x000D,
  0x00A0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A,
  0x2028, 0x2029, 0x202F, 0x205F, 0x3000,
])

export function foldGreekSearch(value) {
  return value
    .normalize('NFD')
    .replace(YPOGEGRAMMENI, 'ι')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(SPACING_MARKS, '')
}

/** Display form of a subject or chapter name. Keep in step with fold_greek_name before it calls fold_greek_search. */
export function plainGreekLabel(value) {
  let normalized = ''
  for (const char of value) {
    const codePoint = char.codePointAt(0)
    if (INVISIBLE.has(codePoint)) continue
    normalized += UNICODE_SPACES.has(codePoint) ? ' ' : char
  }
  return normalized.replace(/ {2,}/g, ' ').trim()
}

/** Uniqueness key for subject and chapter names. Keep in step with public.fold_greek_name. */
export function foldGreekName(value) {
  return foldGreekSearch(plainGreekLabel(value))
}

/** True when the trimmed, folded query is contained in the folded text. A query that folds away matches nothing. */
export function includesFolded(haystack, query) {
  const folded = foldGreekSearch(String(query ?? '').trim())
  if (!folded) return false
  return foldGreekSearch(String(haystack ?? '')).includes(folded)
}

export function searchLikePattern(value) {
  const like = `%${foldGreekSearch(value).replace(/[\\%_]/g, '\\$&')}%`
  if (!POSTGREST_RESERVED.test(like)) return like
  return `"${like.replace(/[\\"]/g, '\\$&')}"`
}
