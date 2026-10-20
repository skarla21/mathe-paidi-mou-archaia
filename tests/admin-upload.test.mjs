import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isAllowedUploadMime,
  isImageEntity,
  isStorageNameTaken,
  isUploadPath,
  mimeAllowedForPath,
  mimeFromMagic,
  readPrefixBytes,
  signUploadTicket,
  storageObjectUrl,
  uploadByteLength,
  uploadBytesMatchTicket,
  uploadObjectPath,
  verifyUploadTicket,
} from '../server/utils/adminUpload.ts'
import { formatUploadStatus, uploadPercent } from '../shared/utils/uploadProgress.mjs'

const SECRET = 'test-secret'

describe('upload tickets', () => {
  it('accepts a ticket for the path and mime it signed', () => {
    const now = 1_700_000_000_000
    const ticket = signUploadTicket('lesson-content/notes-abcd1234.pdf', SECRET, 'application/pdf', now)
    assert.equal(ticket.mime, 'application/pdf')
    assert.equal(verifyUploadTicket(ticket, SECRET, now + 1000), true)
  })

  it('rejects a tampered path, a swapped expiry, a swapped mime, and the wrong secret', () => {
    const now = 1_700_000_000_000
    const ticket = signUploadTicket('lesson-content/notes-abcd1234.pdf', SECRET, 'application/pdf', now)
    assert.equal(verifyUploadTicket({ ...ticket, path: 'lesson-content/other-abcd1234.pdf' }, SECRET, now + 1000), false)
    assert.equal(verifyUploadTicket({ ...ticket, exp: ticket.exp - 1 }, SECRET, now + 1000), false)
    assert.equal(verifyUploadTicket({ ...ticket, mime: 'image/png' }, SECRET, now + 1000), false)
    assert.equal(verifyUploadTicket(ticket, 'other-secret', now + 1000), false)
  })

  it('rejects an expired ticket', () => {
    const now = 1_700_000_000_000
    const ticket = signUploadTicket('lesson-content/notes-abcd1234.pdf', SECRET, 'application/pdf', now)
    assert.equal(verifyUploadTicket(ticket, SECRET, ticket.exp), false)
  })

  it('rejects a mime the folder does not allow', () => {
    const now = 1_700_000_000_000
    const ticket = signUploadTicket('entity-images/cover-abcd1234.png', SECRET, 'application/pdf', now)
    assert.equal(verifyUploadTicket(ticket, SECRET, now + 1000), false)
  })
})

describe('upload paths', () => {
  it('keeps lesson files and entity images in their own folders', () => {
    assert.equal(
      uploadObjectPath('lesson', 'Σημειώσεις.pdf', 'application/pdf', 'chapter', 'abcd1234'),
      'lesson-content/simeioseis-abcd1234.pdf',
    )
    assert.equal(
      uploadObjectPath('image', 'cover.png', 'image/png', 'category', 'abcd1234'),
      'entity-images/category-cover-abcd1234.png',
    )
    assert.equal(isImageEntity('article'), true)
    assert.equal(
      uploadObjectPath('image', 'cover.png', 'image/png', 'article', 'abcd1234'),
      'entity-images/article-cover-abcd1234.png',
    )
    assert.equal(
      uploadObjectPath('lesson', 'cover.png', 'application/pdf', 'chapter', 'abcd1234'),
      'lesson-content/cover-abcd1234.pdf',
    )
    assert.equal(
      uploadObjectPath('preview', 'preview.png', 'image/png', 'lesson', 'abcd1234'),
      'lesson-previews/preview-abcd1234.png',
    )
  })

  it('rejects traversal and folders outside the upload prefixes', () => {
    assert.equal(isUploadPath('lesson-content/notes-abcd1234.pdf'), true)
    assert.equal(isUploadPath('lesson-previews/preview-abcd1234.png'), true)
    assert.equal(isUploadPath('entity-images/category-cover-abcd1234.png'), true)
    assert.equal(isUploadPath('lesson-content/../secret.pdf'), false)
    assert.equal(isUploadPath('avatars/photo.png'), false)
    assert.equal(isUploadPath('lesson-content/nested/notes.pdf'), false)
  })

  it('builds an object URL on the configured project', () => {
    assert.equal(
      storageObjectUrl('https://proj.supabase.co', 'lesson-content/notes-abcd1234.pdf'),
      'https://proj.supabase.co/storage/v1/object/lesson-files/lesson-content/notes-abcd1234.pdf',
    )
    assert.equal(
      storageObjectUrl('https://proj.supabase.co', 'lesson-previews/preview-abcd1234.png'),
      'https://proj.supabase.co/storage/v1/object/uploads/lesson-previews/preview-abcd1234.png',
    )
    assert.equal(storageObjectUrl('https://proj.supabase.co', '../secret.pdf'), null)
  })
})

describe('upload file checks', () => {
  it('reads pdf, jpeg, and png signatures', () => {
    assert.equal(mimeFromMagic(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])), 'application/pdf')
    assert.equal(mimeFromMagic(Uint8Array.from([0xff, 0xd8, 0xff])), 'image/jpeg')
    assert.equal(mimeFromMagic(Uint8Array.from([0x89, 0x50, 0x4e, 0x47])), 'image/png')
    assert.equal(mimeFromMagic(Uint8Array.from([0x00, 0x01, 0x02, 0x03])), null)
  })

  it('allows a pdf only under lesson content', () => {
    assert.equal(mimeAllowedForPath('lesson-content/notes-abcd1234.pdf', 'application/pdf'), true)
    assert.equal(mimeAllowedForPath('entity-images/category-cover-abcd1234.png', 'application/pdf'), false)
    assert.equal(mimeAllowedForPath('entity-images/category-cover-abcd1234.png', 'image/png'), true)
    assert.equal(mimeAllowedForPath('lesson-previews/preview-abcd1234.png', 'image/png'), true)
    assert.equal(mimeAllowedForPath('lesson-previews/preview-abcd1234.png', 'application/pdf'), false)
  })

  it('accepts bytes only when they match the signed mime', () => {
    assert.equal(uploadBytesMatchTicket('application/pdf', 'application/pdf'), true)
    assert.equal(uploadBytesMatchTicket('application/pdf', 'image/png'), false)
    assert.equal(uploadBytesMatchTicket('image/png', null), false)
  })

  it('keeps only the first bytes of a large object body', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 9, 9, 9]))
        controller.enqueue(new Uint8Array(64).fill(1))
        controller.close()
      },
    })
    const prefix = await readPrefixBytes(body, 5)
    assert.deepEqual([...prefix], [0x25, 0x50, 0x44, 0x46, 0x2d])
  })

  it('reads the full size from a range response', () => {
    assert.equal(uploadByteLength(206, 'bytes 0-15/45088768', '16'), 45088768)
    assert.equal(uploadByteLength(200, null, '128'), 128)
    assert.equal(uploadByteLength(206, 'bytes 0-15/*', '16'), null)
  })

  it('rejects a malformed range total and unsafe integer sizes', () => {
    assert.equal(uploadByteLength(206, 'bytes 0-15/not-digits', '16'), null)
    assert.equal(uploadByteLength(200, null, `${Number.MAX_SAFE_INTEGER + 1}`), null)
  })

  it('knows which entities accept images and which mime each target allows', () => {
    assert.equal(isImageEntity('article'), true)
    assert.equal(isImageEntity('nope'), false)
    assert.equal(isAllowedUploadMime('image', 'application/pdf'), false)
    assert.equal(isAllowedUploadMime('lesson', 'application/pdf'), true)
  })

  it('returns null for an invalid project base URL', () => {
    assert.equal(storageObjectUrl('not a url', 'lesson-content/notes-abcd1234.pdf'), null)
  })

  it('detects a taken storage name from status or message', () => {
    assert.equal(isStorageNameTaken({ status: 409 }), true)
    assert.equal(isStorageNameTaken({ message: 'Already exists' }), true)
    assert.equal(isStorageNameTaken({ status: 500, message: 'storage down' }), false)
  })
})

describe('upload progress label', () => {
  it('formats the percent and transferred size in Greek', () => {
    const loaded = Math.round(18.1 * 1024 * 1024)
    const total = 43 * 1024 * 1024
    assert.equal(uploadPercent(loaded, total), 42)
    assert.equal(formatUploadStatus({ checking: false, progress: 42, loaded, total }), '42% · 18,1 MB / 43,0 MB')
  })

  it('switches to the check label after the bytes are sent', () => {
    assert.equal(formatUploadStatus({ checking: true, progress: 100, loaded: 10, total: 10 }), 'Έλεγχος αρχείου…')
  })
})
