import { canonicalHref } from './siteMeta.mjs'

const STATIC_PATHS = ['/', '/about', '/aporrito', '/articles', '/oroi']

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function lastmodStamp(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function buildSitemapEntries(input) {
  const paths = Array.isArray(input?.paths) ? input.paths : []
  const lessonPaths = Array.isArray(input?.lessonPaths) ? input.lessonPaths : []
  const articles = Array.isArray(input?.articles) ? input.articles : []
  const entries = []
  const seen = new Set()

  function add(path, lastmod) {
    const text = String(path ?? '').trim()
    if (!text.startsWith('/') || seen.has(text)) return
    seen.add(text)
    const stamp = lastmodStamp(lastmod)
    entries.push(stamp ? { path: text, lastmod: stamp } : { path: text })
  }

  for (const path of STATIC_PATHS) add(path, null)
  for (const path of paths) add(path, null)
  for (const path of lessonPaths) add(path, null)
  for (const article of articles) {
    if (!article?.published || !article.slug) continue
    add(`/articles/${article.slug}`, article.updated_at)
  }
  return entries
}

export function sitemapXml(entries) {
  const urls = entries.map((entry) => {
    const loc = escapeXml(canonicalHref(entry.path))
    const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''
    return `<url><loc>${loc}</loc>${lastmod}</url>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
}
