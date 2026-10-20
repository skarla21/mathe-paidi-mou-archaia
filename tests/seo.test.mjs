import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  articleImageUrl,
  articleJsonLd,
  breadcrumbList,
  jsonLdGraph,
  jsonLdScript,
  learningResourceNode,
  organizationNode,
  websiteNode,
} from '../app/utils/jsonLd.ts'
import { robotsTxt } from '../shared/utils/robots.mjs'
import { SITE_NAME, SITE_ORIGIN, SITE_OG_IMAGE, SITE_TITLE, canonicalHref, formatDocumentTitle } from '../shared/utils/siteMeta.mjs'
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
    assert.equal(canonicalHref('/aporrito'), `${SITE_ORIGIN}/aporrito`)
    assert.equal(canonicalHref('//evil.com'), `${SITE_ORIGIN}/`)
    assert.equal(canonicalHref('///evil.com'), `${SITE_ORIGIN}/`)
    assert.equal(canonicalHref('https://evil.com/phish'), `${SITE_ORIGIN}/phish`)
  })

  it('falls back to the site root when an http URL cannot be parsed', () => {
    assert.equal(canonicalHref('http://['), `${SITE_ORIGIN}/`)
  })
})

describe('organizationNode and websiteNode', () => {
  it('anchors on SITE_ORIGIN and marks the site language', () => {
    const org = organizationNode()
    assert.equal(org.url, SITE_ORIGIN)
    assert.equal(org['@id'], `${SITE_ORIGIN}/#organization`)
    assert.equal(org.logo, canonicalHref('/imgs/mathe_archaia_logo.jpg'))

    const site = websiteNode()
    assert.equal(site.url, SITE_ORIGIN)
    assert.equal(site.inLanguage, 'el')
    assert.equal(site.publisher['@id'], `${SITE_ORIGIN}/#organization`)
  })
})

describe('breadcrumbList', () => {
  it('numbers items from one and uses canonical paths', () => {
    const data = breadcrumbList([
      { name: 'Άρθρα', path: '/articles' },
      { name: 'Τίτλος', path: '/articles/titlos' },
    ])
    assert.deepEqual(data.itemListElement.map((item) => item.position), [1, 2])
    assert.equal(data.itemListElement[0].item, canonicalHref('/articles'))
    assert.equal(data.itemListElement[1].item, canonicalHref('/articles/titlos'))
  })
})

describe('articleImageUrl', () => {
  it('keeps absolute URLs and falls back for relative or empty values', () => {
    assert.equal(articleImageUrl('  https://cdn.example/a.jpg  '), 'https://cdn.example/a.jpg')
    assert.equal(articleImageUrl('http://cdn.example/a.jpg'), 'http://cdn.example/a.jpg')
    assert.equal(articleImageUrl('/uploads/cover.png'), SITE_OG_IMAGE)
    assert.equal(articleImageUrl('   '), SITE_OG_IMAGE)
    assert.equal(articleImageUrl(null), SITE_OG_IMAGE)
  })
})

describe('learningResourceNode', () => {
  it('omits blank fields and passes free access through', () => {
    const sparse = learningResourceNode({
      name: 'Κεφάλαιο',
      description: '   ',
      path: '/notes/keimeno',
      educationalLevel: null,
      isAccessibleForFree: true,
    })
    assert.equal(sparse.name, 'Κεφάλαιο')
    assert.equal(Object.hasOwn(sparse, 'description'), false)
    assert.equal(Object.hasOwn(sparse, 'educationalLevel'), false)
    assert.equal(sparse.isAccessibleForFree, true)
    assert.equal(sparse.learningResourceType, 'Σημειώσεις')
    assert.equal(sparse.url, canonicalHref('/notes/keimeno'))

    const full = learningResourceNode({
      name: 'Κεφάλαιο',
      description: ' Περίληψη ',
      path: '/notes/keimeno',
      educationalLevel: ' Α Λυκείου ',
      isAccessibleForFree: false,
    })
    assert.equal(full.description, 'Περίληψη')
    assert.equal(full.educationalLevel, 'Α Λυκείου')
    assert.equal(full.isAccessibleForFree, false)
  })
})

describe('jsonLdGraph', () => {
  it('wraps the nodes in one schema.org graph', () => {
    const node = organizationNode()
    assert.deepEqual(jsonLdGraph([node]), {
      '@context': 'https://schema.org',
      '@graph': [node],
    })
  })
})

describe('jsonLdScript', () => {
  it('escapes less-than signs in the serialized graph', () => {
    const script = jsonLdScript({ note: '<script>' }, 'article-ld')
    assert.equal(script.key, 'article-ld')
    assert.match(script.innerHTML, /\\u003c/)
    assert.equal(script.innerHTML.includes('<'), false)
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
    assert.equal(entries.some((entry) => entry.path === '/aporrito'), true)
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
