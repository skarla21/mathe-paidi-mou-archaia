import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { closedAvatarBlob } from '../shared/utils/avatarPreview.mjs'

describe('closedAvatarBlob', () => {
  it('revokes a blob preview only after the modal closes and the upload finishes', () => {
    const preview = 'blob:http://localhost/avatar'
    assert.equal(closedAvatarBlob({ open: false, preview, uploading: false }), preview)
    assert.equal(closedAvatarBlob({ open: true, preview, uploading: false }), '')
    assert.equal(closedAvatarBlob({ open: false, preview, uploading: true }), '')
    assert.equal(closedAvatarBlob({ open: false, preview: 'https://cdn.example/a.png', uploading: false }), '')
  })
})
