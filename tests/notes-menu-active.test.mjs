import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { notesMenuActive } from '../app/utils/notesMenuActive.ts'

describe('notesMenuActive', () => {
  it('stays inactive on extra-material pages', () => {
    assert.equal(notesMenuActive({ path: '/notes', gradeSlugs: [], catalogFailed: false, gradeParam: '' }), false)
    assert.equal(notesMenuActive({ path: '/category/extra', gradeSlugs: [], catalogFailed: false, gradeParam: '' }), false)
    assert.equal(notesMenuActive({ path: '/category/extra/lesson', gradeSlugs: [], catalogFailed: false, gradeParam: '' }), false)
    assert.equal(notesMenuActive({ path: '/articles', gradeSlugs: [], catalogFailed: false, gradeParam: '' }), false)
    assert.equal(notesMenuActive({ path: '/articles/abc', gradeSlugs: [], catalogFailed: false, gradeParam: '' }), false)
  })

  it('highlights a loaded grade slug', () => {
    assert.equal(notesMenuActive({
      path: '/a-lykeiou/archaia',
      gradeSlugs: ['a-lykeiou'],
      catalogFailed: false,
      gradeParam: 'a-lykeiou',
    }), true)
  })

  it('stays inactive on another page and on an unknown grade route', () => {
    assert.equal(notesMenuActive({
      path: '/login',
      gradeSlugs: ['a-lykeiou'],
      catalogFailed: false,
      gradeParam: '',
    }), false)
    assert.equal(notesMenuActive({
      path: '/this-is-not-a-page',
      gradeSlugs: ['a-lykeiou'],
      catalogFailed: false,
      gradeParam: 'this-is-not-a-page',
    }), false)
  })

  it('highlights the grade route when the catalog request failed', () => {
    assert.equal(notesMenuActive({
      path: '/a-lykeiou',
      gradeSlugs: [],
      catalogFailed: true,
      gradeParam: 'a-lykeiou',
    }), true)
    assert.equal(notesMenuActive({
      path: '/login',
      gradeSlugs: [],
      catalogFailed: true,
      gradeParam: '',
    }), false)
  })
})
