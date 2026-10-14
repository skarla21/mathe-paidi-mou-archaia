import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extrasMenuActive } from '../app/utils/extrasMenuActive.ts'

describe('extrasMenuActive', () => {
  it('highlights category pages', () => {
    assert.equal(extrasMenuActive('/category/extra'), true)
    assert.equal(extrasMenuActive('/category/extra/lesson'), true)
  })

  it('stays inactive on articles, the home page, and other routes', () => {
    assert.equal(extrasMenuActive('/'), false)
    assert.equal(extrasMenuActive('/about'), false)
    assert.equal(extrasMenuActive('/notes'), false)
    assert.equal(extrasMenuActive('/articles'), false)
    assert.equal(extrasMenuActive('/articles/abc'), false)
    assert.equal(extrasMenuActive('/a-lykeiou/archaia'), false)
    assert.equal(extrasMenuActive('/categories'), false)
  })
})
