export const SITE_ORIGIN = 'https://mathearchaia.gr'

export const SITE_NAME = 'Μάθε Παιδί Μου Αρχαία'

export const SITE_TITLE =
  `${SITE_NAME} — Διδακτικό υλικό και ιδιαίτερα για όλες τις τάξεις`

export const SITE_DESCRIPTION =
  'Διδακτικό υλικό για Αρχαία Ελληνικά σε όλες τις σχολικές τάξεις: σημειώσεις, κεφάλαια και ιδιαίτερα μαθήματα από τη φιλόλογο.'

export const SITE_LOGO_PATH = '/imgs/mathe_archaia_logo.jpg'

export const SITE_OG_IMAGE = `${SITE_ORIGIN}/og.jpg`

export function formatDocumentTitle(title) {
  const text = typeof title === 'string' ? title.trim() : ''
  if (!text) return SITE_TITLE
  if (text.includes(SITE_NAME)) return text
  return `${text} — ${SITE_NAME}`
}

export function canonicalHref(path) {
  const raw = String(path ?? '').trim()
  if (!raw) return `${SITE_ORIGIN}/`
  let pathname = raw
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname || '/'
    } catch {
      return `${SITE_ORIGIN}/`
    }
  } else {
    pathname = raw.split(/[?#]/)[0] || '/'
  }
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return `${SITE_ORIGIN}/`
  let href
  try {
    href = new URL(pathname, `${SITE_ORIGIN}/`)
  } catch {
    return `${SITE_ORIGIN}/`
  }
  if (href.origin !== SITE_ORIGIN) return `${SITE_ORIGIN}/`
  return href.href
}
