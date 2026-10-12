import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  acceptedEntityImageUrl,
  entityImageDraft,
  entityImageSaveFields,
} from '../shared/utils/entityImageUrl.mjs'

const SUPABASE_URL = 'https://proj.supabase.co'
const IMAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/cover.png`

describe('acceptedEntityImageUrl', () => {
  it('accepts a storage entity image', () => {
    assert.equal(acceptedEntityImageUrl(`  ${IMAGE_URL}  `, SUPABASE_URL), IMAGE_URL)
  })

  it('turns an empty value into null', () => {
    assert.equal(acceptedEntityImageUrl('', SUPABASE_URL), null)
    assert.equal(acceptedEntityImageUrl('   ', SUPABASE_URL), null)
    assert.equal(acceptedEntityImageUrl(null, SUPABASE_URL), null)
  })

  it('rejects an outside image and a file outside entity-images', () => {
    assert.equal(acceptedEntityImageUrl('https://cdn.example/cover.png', SUPABASE_URL), false)
    assert.equal(
      acceptedEntityImageUrl(`${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/notes.pdf`, SUPABASE_URL),
      false,
    )
  })

  it('stores the canonical storage url', () => {
    const dirty = `https://user:pass@proj.supabase.co/storage/v1/object/public/uploads/entity-images/cover.png?download=1#preview`
    assert.equal(acceptedEntityImageUrl(dirty, SUPABASE_URL), IMAGE_URL)
  })

  it('rejects a storage prefix that is not the public object path', () => {
    assert.equal(
      acceptedEntityImageUrl(
        `${SUPABASE_URL}/auth/v1/storage/v1/object/public/uploads/entity-images/cover.png`,
        SUPABASE_URL,
      ),
      false,
    )
  })

  it('rejects a path that leaves entity-images', () => {
    assert.equal(
      acceptedEntityImageUrl(
        `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/../lesson-content/secret.pdf`,
        SUPABASE_URL,
      ),
      false,
    )
    assert.equal(
      acceptedEntityImageUrl(
        `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/foo..png`,
        SUPABASE_URL,
      ),
      false,
    )
  })
})

describe('entity image save', () => {
  it('keeps a legacy url out of an edit', () => {
    const draft = entityImageDraft('https://cdn.example/cover.png', SUPABASE_URL)
    assert.deepEqual(draft, { draft: '', preserveExisting: true })
    assert.deepEqual(entityImageSaveFields({ ...draft, creating: false, removed: false }), {})
  })

  it('clears an image only after an explicit remove', () => {
    assert.deepEqual(
      entityImageSaveFields({ draft: '', preserveExisting: true, creating: false, removed: true }),
      { image_url: null },
    )
  })

  it('sends a canonical upload and an empty create', () => {
    const kept = entityImageDraft(`  ${IMAGE_URL}?x=1  `, SUPABASE_URL)
    assert.deepEqual(kept, { draft: IMAGE_URL, preserveExisting: false })
    assert.deepEqual(entityImageSaveFields({ ...kept, creating: false, removed: false }), {
      image_url: IMAGE_URL,
    })
    assert.deepEqual(
      entityImageSaveFields({ draft: '', preserveExisting: false, creating: true, removed: false }),
      { image_url: null },
    )
  })
})
