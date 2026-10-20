import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { articleJsonLd } from '../app/utils/jsonLd.ts'
import { robotsTxt } from '../shared/utils/robots.mjs'
import { SITE_NAME, SITE_ORIGIN, SITE_TITLE, canonicalHref, formatDocumentTitle } from '../shared/utils/siteMeta.mjs'
import { buildSitemapEntries, sitemapXml } from '../shared/utils/sitemap.mjs'

describe('formatDocumentTitle', () => {
  it('leaves a branded home title alone and suffixes a short title', () => {
    assert.equal(formatDocumentTitle(SITE_TITLE), SITE_TITLE)
    assert.equal(formatDocumentTitle('Σχετικά'), `Σχετικά — ${SITE_NAME}`)
  })
})

describe('canonicalHref', () => {
  it('stays on this origin and rejects a protocol-relative path', () => {
    assert.equal(canonicalHref('/oroi'), `${SITE_ORIGIN}/oroi`)
    assert.equal(canonicalHref('//evil.com'), `${SITE_ORIGIN}/`)
    assert.equal(canonicalHref('///evil.com'), `${SITE_ORIGIN}/`)
    assert.equal(canonicalHref('https://evil.com/phish'), `${SITE_ORIGIN}/phish`)
  })
})

describe('sitemap', () => {
  it('emits each lesson once, skips unpublished articles, and escapes titles', () => {
    const entries = buildSitemapEntries({
      paths: ['/a-lykeiou'],
      lessonPaths: ['/a-lykeiou/archaia/keimeno/mathima', '/a-lykeiou/archaia/keimeno/mathima'],
      articles: [
        { slug: 'hidden', published: false, title: 'Κρυφό', updated_at: '2026-01-01T00:00:00.000Z' },
        { slug: 'Α < Β & Γ', published: true, title: 'Α < Β & Γ', updated_at: '2026-05-01T00:00:00.000Z' },
      ],
    })
    const lessonPaths = entries.filter((entry) => entry.path === '/a-lykeiou/archaia/keimeno/mathima')
    assert.equal(lessonPaths.length, 1)
    assert.equal(entries.some((entry) => entry.path === '/oroi'), true)
    assert.equal(entries.some((entry) => entry.path === '/articles/hidden'), false)
    const xml = sitemapXml(entries)
    assert.equal(xml.includes('Κρυφό'), false)
    assert.equal(xml.includes('hidden'), false)
    assert.equal(xml.includes('< Β'), false)
    assert.match(xml, /%3C/)
    assert.match(xml, /&amp;/)
    assert.match(xml, /<lastmod>2026-05-01T00:00:00\.000Z<\/lastmod>/)
  })
})

describe('articleJsonLd', () => {
  it('includes the headline, dates, and organization author', () => {
    const data = articleJsonLd({
      title: 'Η ύλη της Α Λυκείου',
      description: 'Σημειώσεις για την τάξη.',
      path: '/articles/yli',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
      imageUrl: 'https://cdn.example/photo.jpg',
    })
    assert.equal(data.headline, 'Η ύλη της Α Λυκείου')
    assert.equal(data.datePublished, '2026-03-01T10:00:00.000Z')
    assert.equal(data.dateModified, '2026-04-02T10:00:00.000Z')
    assert.equal(data.author['@type'], 'Organization')
    assert.equal(data.author.name, SITE_NAME)
    assert.equal(data.image, 'https://cdn.example/photo.jpg')
  })
})

describe('robotsTxt', () => {
  it('disallows private paths and points at the sitemap', () => {
    const body = robotsTxt()
    assert.match(body, /Disallow: \/admin/)
    assert.match(body, /Disallow: \/dashboard/)
    assert.match(body, /Disallow: \/reset-password/)
    assert.match(body, /Disallow: \/search/)
    assert.match(body, /Disallow: \/api/)
    assert.match(body, /Sitemap: https:\/\/mathearchaia\.gr\/sitemap\.xml/)
    assert.equal(body.includes('GPTBot'), false)
  })
})
