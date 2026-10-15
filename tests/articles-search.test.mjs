import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { foldGreekSearch, includesFolded } from '../shared/utils/foldGreekSearch.mjs'

const articlesGet = readFileSync(
  new URL('../server/api/articles.get.ts', import.meta.url),
  'utf8',
)
const adminArticles = readFileSync(
  new URL('../server/utils/adminArticles.ts', import.meta.url),
  'utf8',
)
const adminLessons = readFileSync(
  new URL('../server/utils/adminLessons.ts', import.meta.url),
  'utf8',
)
const migration = readFileSync(
  new URL('../supabase/migrations/20261015210000_article_search_fold.sql', import.meta.url),
  'utf8',
)
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')

describe('article public search folding', () => {
  it('matches unaccented chip queries the way the old client filter did', () => {
    assert.equal(includesFolded('εκπαίδευση', 'εκπαι'), true)
    assert.equal(includesFolded('εκπαίδευση', 'εκπαιδευση'), true)
    assert.equal(foldGreekSearch('εκπαίδευση'), 'εκπαιδευση')
  })

  it('searches folded title and tags columns instead of accent-sensitive ilike/cs', () => {
    assert.match(articlesGet, /searchLikePattern/)
    assert.match(articlesGet, /title_folded/)
    assert.match(articlesGet, /tags_folded/)
    assert.doesNotMatch(articlesGet, /tags\.cs/)
    assert.doesNotMatch(articlesGet, /orIlike\(\['title'\]/)
  })

  it('keeps admin article and lesson table search on folded columns after pagination', () => {
    assert.match(adminArticles, /foldedTextOr\('title_folded'/)
    assert.match(adminArticles, /foldedTextOr\('tags_folded'/)
    assert.doesNotMatch(adminArticles, /orIlike\(\['title'\]/)
    assert.match(adminLessons, /foldedTextOr\('title_folded'/)
    assert.match(adminLessons, /foldedTextOr\('tags_folded'/)
    assert.doesNotMatch(adminLessons, /orIlike\(\['title'\]/)
  })

  it('adds generated folded columns for articles in migration and schema', () => {
    assert.match(migration, /fold_article_tags/)
    assert.match(migration, /title_folded[\s\S]*fold_greek_search\(title\)/)
    assert.match(migration, /tags_folded[\s\S]*fold_article_tags\(tags\)/)
    assert.match(schema, /fold_article_tags/)
    assert.match(schema, /articles[\s\S]*title_folded/)
    assert.match(schema, /articles[\s\S]*tags_folded/)
  })
})
