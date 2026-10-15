import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { slugifyGreek, uniqueSlug } from '../shared/utils/slugify.mjs'

const adminCreate = readFileSync(
  new URL('../server/api/admin/articles.post.ts', import.meta.url),
  'utf8',
)
const publicGet = readFileSync(
  new URL('../server/api/articles/[slug].get.ts', import.meta.url),
  'utf8',
)
const articlePage = readFileSync(
  new URL('../app/pages/articles/[slug].vue', import.meta.url),
  'utf8',
)
const articlesIndex = readFileSync(
  new URL('../app/pages/articles/index.vue', import.meta.url),
  'utf8',
)
const homeExtras = readFileSync(
  new URL('../app/components/home/HomeExtras.vue', import.meta.url),
  'utf8',
)
const adminPatch = readFileSync(
  new URL('../server/api/admin/articles/[id].patch.ts', import.meta.url),
  'utf8',
)
const contentSlug = readFileSync(
  new URL('../server/utils/contentSlug.ts', import.meta.url),
  'utf8',
)
const migration = readFileSync(
  new URL('../supabase/migrations/20261015200000_article_slugs.sql', import.meta.url),
  'utf8',
)

describe('article slugs', () => {
  it('slugifies a Greek article title', () => {
    assert.equal(
      slugifyGreek(
        'Δημιουργική Μάθηση: Η Δύναμη της Φαντασίας στην Εκπαίδευση!',
      ),
      'dimiourgiki-mathisi-i-dynami-tis-fantasias-stin-ekpaidefsi',
    )
  })

  it('suffixes only when the slug is taken', () => {
    assert.equal(uniqueSlug('dimiourgiki-mathisi', []), 'dimiourgiki-mathisi')
    assert.equal(
      uniqueSlug('dimiourgiki-mathisi', ['dimiourgiki-mathisi']),
      'dimiourgiki-mathisi-2',
    )
  })

  it('creates slugs on admin create and keeps them stable on patch', () => {
    assert.match(contentSlug, /export async function nextArticleSlug/)
    assert.match(adminCreate, /nextArticleSlug/)
    assert.match(adminCreate, /slug,/)
    assert.doesNotMatch(adminPatch, /nextArticleSlug/)
  })

  it('resolves the public article page by slug and mutates by id', () => {
    assert.match(publicGet, /\.eq\('slug', slug\)/)
    assert.match(articlePage, /route\.params\.slug/)
    assert.match(articlePage, /\/api\/articles\/\$\{slug\.value\}/)
    assert.match(articlePage, /\/api\/articles\/\$\{a\.id\}\/like/)
    assert.match(articlePage, /\/api\/articles\/\$\{articleId\}\/comments/)
    assert.match(articlesIndex, /\/articles\/\$\{a\.slug\}/)
    assert.match(homeExtras, /\/articles\/\$\{article\.slug\}/)
  })

  it('falls back to id when the path param is a UUID and redirects to the slug', () => {
    assert.match(publicGet, /isUuid/)
    assert.match(publicGet, /\.eq\('id', slug\)/)
    assert.match(publicGet, /Δεν βρέθηκε/)
    assert.doesNotMatch(publicGet, /Not found/)
    assert.match(articlePage, /navigateTo/)
    assert.match(articlePage, /redirectCode:\s*301/)
  })

  it('adds a unique articles.slug column in the migration', () => {
    assert.match(migration, /articles_slug_key/)
    assert.match(migration, /alter column slug set not null/)
  })

  it('backfills missing article slugs in schema.sql alter path', () => {
    const schema = readFileSync(
      new URL('../supabase/schema.sql', import.meta.url),
      'utf8',
    )
    assert.match(schema, /alter table public\.articles add column if not exists slug/)
    assert.match(
      schema,
      /update public\.articles[\s\S]*slug = 'article-' \|\| replace\(id::text/,
    )
  })
})
