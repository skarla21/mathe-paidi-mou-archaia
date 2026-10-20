import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lessonExcerpt } from '../shared/utils/lessonExcerpt.mjs'

describe('lessonExcerpt', () => {
  it('returns plain text from lesson html', () => {
    assert.equal(
      lessonExcerpt('<p>Πρώτη παράγραφος.</p><p>Δεύτερη <strong>λέξη</strong>.</p>'),
      'Πρώτη παράγραφος. Δεύτερη λέξη.',
    )
  })

  it('drops scripts, styles, and line breaks, and decodes entities', () => {
    assert.equal(
      lessonExcerpt('<script>alert(1)</script><style>body{color:red}</style><p>Α &amp; Β&nbsp;Γ</p>'),
      'Α & Β Γ',
    )
    assert.equal(lessonExcerpt('Πρώτη<br>δεύτερη<br/>τρίτη'), 'Πρώτη δεύτερη τρίτη')
  })

  it('keeps a short description whole', () => {
    assert.equal(lessonExcerpt('Σύντομη περιγραφή'), 'Σύντομη περιγραφή')
    assert.equal(lessonExcerpt(null), '')
    assert.equal(lessonExcerpt('   '), '')
  })

  it('cuts a long description on a word and marks the cut', () => {
    const words = Array.from({ length: 40 }, (_, index) => `λέξη${index + 1}`)
    const excerpt = lessonExcerpt(words.join(' '), 40)
    assert.ok(excerpt.endsWith('…'))
    assert.ok(excerpt.length <= 41)
    assert.equal(excerpt.includes('λέξη1'), true)
    assert.equal(excerpt.includes(' '), true)
  })

  it('cuts a word when the line has no space in the kept part', () => {
    assert.equal(lessonExcerpt('abcdefghijklmnopqrstuvwxyz', 10), 'abcdefghij…')
  })

  it('decodes numeric, hex, surrogate, and unknown entities', () => {
    assert.equal(lessonExcerpt('&#39;'), "'")
    assert.equal(lessonExcerpt('&#x2026;'), '…')
    assert.equal(lessonExcerpt('&#xD800;'), '')
    assert.equal(lessonExcerpt('&unknown;'), '')
  })
})
