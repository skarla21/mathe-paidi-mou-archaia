import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { signedLessonContentUrl } from '../server/utils/lessonFileAccess.ts'

const SUPABASE_URL = 'https://proj.supabase.co'
const FILE_PATH = 'lesson-content/1-notes.pdf'
const FILE_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/${FILE_PATH}`
const SIGNED = `${SUPABASE_URL}/storage/v1/object/sign/lesson-files/${FILE_PATH}?token=abc`

function fakeStorage({ signError = null, missing = false } = {}) {
  const calls = []
  return {
    calls,
    client: {
      storage: {
        from(bucket) {
          if (bucket !== 'lesson-files') throw new Error(`unexpected bucket ${bucket}`)
          return {
            createSignedUrl(path) {
              calls.push(['sign', path])
              if (missing) {
                return Promise.resolve({ data: null, error: { message: 'Object not found', statusCode: '404' } })
              }
              if (signError) return Promise.resolve({ data: null, error: signError })
              return Promise.resolve({ data: { signedUrl: SIGNED }, error: null })
            },
          }
        },
      },
    },
  }
}

describe('signedLessonContentUrl', () => {
  it('signs a stored path and does not copy or delete', async () => {
    const storage = fakeStorage()
    const url = await signedLessonContentUrl(storage.client, FILE_PATH, SUPABASE_URL)
    assert.equal(url, SIGNED)
    assert.equal(url.includes('/object/public/'), false)
    assert.deepEqual(storage.calls, [['sign', FILE_PATH]])
  })

  it('signs a leftover public uploads url as the same private path', async () => {
    const storage = fakeStorage()
    const url = await signedLessonContentUrl(storage.client, FILE_URL, SUPABASE_URL)
    assert.equal(url, SIGNED)
    assert.deepEqual(storage.calls, [['sign', FILE_PATH]])
  })

  it('rejects a url outside this project without touching storage', async () => {
    const storage = fakeStorage()
    await assert.rejects(
      () => signedLessonContentUrl(storage.client, 'https://evil.example/file.pdf', SUPABASE_URL),
      /unrecognized lesson file/,
    )
    assert.deepEqual(storage.calls, [])
  })

  it('throws when the private object is missing', async () => {
    const storage = fakeStorage({ missing: true })
    await assert.rejects(
      () => signedLessonContentUrl(storage.client, FILE_PATH, SUPABASE_URL),
      /Object not found/,
    )
    assert.deepEqual(storage.calls, [['sign', FILE_PATH]])
  })
})
