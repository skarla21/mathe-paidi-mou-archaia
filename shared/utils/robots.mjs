import { SITE_ORIGIN } from './siteMeta.mjs'

export function robotsTxt(origin = SITE_ORIGIN) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /reset-password',
    'Disallow: /search',
    'Disallow: /api',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
}
