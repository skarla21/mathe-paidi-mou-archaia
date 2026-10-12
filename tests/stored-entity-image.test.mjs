import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { storedEntityImageUrl } from '../server/utils/storedEntityImage.ts'

const SUPABASE_URL = 'https://proj.supabase.co'
const IMAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/cover.png`

globalThis.useRuntimeConfig = () => ({ public: { supabaseUrl: SUPABASE_URL } })
globalThis.createError = (error) => Object.assign(new Error(error.message), error)

describe('storedEntityImageUrl', () => {
  it('turns an empty value into null', () => {
    assert.equal(storedEntityImageUrl(null), null)
    assert.equal(storedEntityImageUrl(undefined), null)
    assert.equal(storedEntityImageUrl(''), null)
    assert.equal(storedEntityImageUrl('   '), null)
  })

  it('returns the canonical storage url', () => {
    assert.equal(storedEntityImageUrl(`  ${IMAGE_URL}?download=1  `), IMAGE_URL)
  })

  it('rejects an outside image and a non-string', () => {
    assert.throws(() => storedEntityImageUrl('https://cdn.example/cover.png'), {
      statusCode: 400,
      message: 'Η εικόνα πρέπει να προέρχεται από μεταφόρτωση',
    })
    assert.throws(() => storedEntityImageUrl(12), { statusCode: 400 })
  })
})
