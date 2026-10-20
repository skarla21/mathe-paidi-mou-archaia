import { sitemapXml } from '#shared/utils/sitemap.mjs'
import { publicSitemapEntries } from '../utils/publicSitemap'
import { serverSupabaseService } from '../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const entries = await publicSitemapEntries(serverSupabaseService())
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return sitemapXml(entries)
})
