import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { purchaseCardState } from '../app/utils/purchaseCard.ts'

describe('purchaseCardState', () => {
  it('links a purchase that has a public path', () => {
    assert.deepEqual(purchaseCardState('/a-lykeiou/archaia/enotita/keimeno'), {
      to: '/a-lykeiou/archaia/enotita/keimeno',
      note: null,
    })
  })

  it('explains a purchase that has no public page', () => {
    assert.deepEqual(purchaseCardState(null), {
      to: null,
      note: 'Δεν υπάρχει δημόσια σελίδα για αυτό το υλικό.',
    })
  })

  it('dashboard shows saved lessons from bookmarks', () => {
    const source = readFileSync(new URL('../app/pages/dashboard.vue', import.meta.url), 'utf8')
    assert.match(source, /\/api\/user\/bookmarks/)
    assert.match(source, /ContentCard/)
    assert.match(source, /preview_url/)
  })
})
