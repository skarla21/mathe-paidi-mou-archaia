import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  articleMatchesQuery,
  filterArticlesByQuery,
} from '../app/utils/articleListFilter.ts'

const sample = {
  title: 'Ο Όμηρος και η Ιλιάδα',
  tags: ['έπος', 'Όμηρος'],
  excerpt: 'Μια σύντομη εισαγωγή στην επική ποίηση.',
}

describe('articleMatchesQuery', () => {
  it('matches empty query to every article', () => {
    assert.equal(articleMatchesQuery(sample, ''), true)
    assert.equal(articleMatchesQuery(sample, '   '), true)
  })

  it('matches folded title, tag, or excerpt', () => {
    assert.equal(articleMatchesQuery(sample, 'ομηρος'), true)
    assert.equal(articleMatchesQuery(sample, 'ΕΠΟΣ'), true)
    assert.equal(articleMatchesQuery(sample, 'επικη'), true)
  })

  it('rejects non-matches', () => {
    assert.equal(articleMatchesQuery(sample, 'Θουκυδίδης'), false)
    assert.equal(articleMatchesQuery({ title: 'Α', tags: null, excerpt: null }, 'β'), false)
  })
})

describe('filterArticlesByQuery', () => {
  it('returns the full list when the query is blank', () => {
    const rows = [sample, { title: 'Άλλο', tags: [], excerpt: '' }]
    assert.equal(filterArticlesByQuery(rows, '  ').length, 2)
  })

  it('keeps only matching rows', () => {
    const rows = [
      sample,
      { title: 'Θουκυδίδης', tags: ['ιστορία'], excerpt: 'Ο πόλεμος των Πελοποννησίων.' },
    ]
    const filtered = filterArticlesByQuery(rows, 'ιλιαδα')
    assert.equal(filtered.length, 1)
    assert.equal(filtered[0].title, sample.title)
  })
})
