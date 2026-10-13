import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extrasMenuActive } from '../app/utils/extrasMenuActive.ts'

describe('extrasMenuActive', () => {
  it('highlights category, notes, and article pages', () => {
    assert.equal(extrasMenuActive('/notes'), true)
    assert.equal(extrasMenuActive('/category/extra'), true)
    assert.equal(extrasMenuActive('/category/extra/lesson'), true)
    assert.equal(extrasMenuActive('/articles'), true)
    assert.equal(extrasMenuActive('/articles/abc'), true)
  })

  it('stays inactive on the notes catalog and other pages', () => {
    assert.equal(extrasMenuActive('/'), false)
    assert.equal(extrasMenuActive('/about'), false)
    assert.equal(extrasMenuActive('/a-lykeiou/archaia'), false)
    assert.equal(extrasMenuActive('/categories'), false)
  })
})
