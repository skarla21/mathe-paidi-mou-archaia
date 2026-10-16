import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { chapterLessonContext, categoryLessonContext, subjectLessonContext } from '../app/lib/lessonContext.ts'
import {
  contentLengthFromHeaders,
  lessonDownloadName,
  lessonFileSizeLabel,
  lessonImagePreviewUrl,
  lessonPageCountLabel,
  publicLessonPreviewUrl,
  strongestVisiblePage,
} from '../shared/utils/lessonPreviewUrl.mjs'

const origin = 'https://abc.supabase.co'
const image = `${origin}/storage/v1/object/public/uploads/lesson-content/dice.png`

describe('publicLessonPreviewUrl', () => {
  it('keeps a stored lesson preview image', () => {
    const preview = `${origin}/storage/v1/object/public/uploads/lesson-previews/cover.png`
    assert.equal(publicLessonPreviewUrl(preview, origin), preview)
  })

  it('drops a lesson pdf, a content image, a foreign origin, and a preview path that climbs out', () => {
    assert.equal(
      publicLessonPreviewUrl(`${origin}/storage/v1/object/public/uploads/lesson-previews/sheet.pdf`, origin),
      null,
    )
    assert.equal(
      publicLessonPreviewUrl(`${origin}/storage/v1/object/public/uploads/lesson-content/dice.png`, origin),
      null,
    )
    assert.equal(
      publicLessonPreviewUrl(`${origin}/storage/v1/object/public/uploads/lesson-previews/%2e%2e/lesson-content/secret.pdf`, origin),
      null,
    )
    assert.equal(
      publicLessonPreviewUrl('https://evil.example/storage/v1/object/public/uploads/lesson-previews/cover.png', origin),
      null,
    )
    assert.equal(publicLessonPreviewUrl('', origin), null)
    assert.equal(
      publicLessonPreviewUrl(`${origin}/storage/v1/object/public/uploads/lesson-previews/cover.png`),
      null,
    )
  })
})

describe('lessonImagePreviewUrl', () => {
  it('asks storage for a small render of a lesson image', () => {
    assert.equal(
      lessonImagePreviewUrl(image),
      `${origin}/storage/v1/render/image/public/uploads/lesson-content/dice.png?width=400&quality=50&resize=contain`,
    )
  })

  it('keeps a pdf on its original url', () => {
    const pdf = `${origin}/storage/v1/object/public/uploads/lesson-content/sheet.pdf`
    assert.equal(lessonImagePreviewUrl(pdf), pdf)
  })

  it('leaves urls outside lesson storage alone', () => {
    const other = 'https://example.com/a.png'
    assert.equal(lessonImagePreviewUrl(other), other)
  })

  it('does not rewrite a path that climbs out of lesson storage', () => {
    const parent = `${origin}/storage/v1/object/public/uploads/lesson-content/%2e%2e/secret.png`
    const backslash = `${origin}/storage/v1/object/public/uploads/lesson-content/a%5Cb.png`
    const nested = `${origin}/prefix/storage/v1/object/public/uploads/lesson-content/dice.png`
    assert.equal(lessonImagePreviewUrl(parent), parent)
    assert.equal(lessonImagePreviewUrl(backslash), backslash)
    assert.equal(lessonImagePreviewUrl(nested), nested)
  })
})

describe('contentLengthFromHeaders', () => {
  it('prefers the range total over the single-byte length', () => {
    assert.equal(contentLengthFromHeaders('1', 'bytes 0-0/4823441'), 4823441)
  })

  it('uses content-length when the range total is missing', () => {
    assert.equal(contentLengthFromHeaders('2048', null), 2048)
    assert.equal(contentLengthFromHeaders('99', 'bytes 0-0/*'), 99)
    assert.equal(contentLengthFromHeaders('12', 'bytes 0-0/0'), 12)
  })

  it('returns zero when both headers are empty', () => {
    assert.equal(contentLengthFromHeaders(null, ''), 0)
  })
})

describe('strongestVisiblePage', () => {
  it('keeps the page that is still the most visible', () => {
    assert.equal(strongestVisiblePage([[1, 0.8], [2, 0.15]]), 1)
  })

  it('returns zero when every stored page is off screen', () => {
    assert.equal(strongestVisiblePage([[1, 0], [2, 0]]), 0)
  })
})

describe('lessonDownloadName', () => {
  it('uses the lesson title and the file extension', () => {
    assert.equal(lessonDownloadName('Περιγραφή: ζάρι', `${image}?token=1`), 'Περιγραφή ζάρι.png')
  })

  it('falls back when the title is empty', () => {
    assert.equal(lessonDownloadName('   ', 'https://x/a.pdf'), 'yliko.pdf')
  })
})

describe('lessonFileSizeLabel', () => {
  it('writes the file size in megabytes', () => {
    assert.equal(lessonFileSizeLabel(1.2 * 1024 * 1024), '1,2 MB')
    assert.equal(lessonFileSizeLabel(12.4 * 1024 * 1024), '12 MB')
    assert.equal(lessonFileSizeLabel(40 * 1024), '0,04 MB')
    assert.equal(lessonFileSizeLabel(0), '')
  })
})
describe('lessonPageCountLabel', () => {
  it('uses the singular for one page', () => {
    assert.equal(lessonPageCountLabel(1), '1 σελίδα')
    assert.equal(lessonPageCountLabel(8), '8 σελίδες')
  })
})

describe('lesson page context', () => {
  const grade = { name: 'Γ΄ Δημοτικού', slug: 'g-dimotikou' }
  const subject = { name: 'Γλώσσα', slug: 'glossa' }

  it('sends a chapter lesson back to its chapter', () => {
    const context = chapterLessonContext({
      grade,
      subject,
      chapter: { title: 'Περιγραφή', slug: 'perigrafi' },
    })
    assert.equal(context.parent.name, 'Περιγραφή')
    assert.equal(context.parent.to, '/g-dimotikou/glossa/perigrafi')
    assert.deepEqual(context.chips.map((chip) => chip.tone), ['grade', 'subject', 'chapter'])
  })

  it('sends a subject lesson back to its subject', () => {
    const context = subjectLessonContext({ grade, subject })
    assert.equal(context.parent.to, '/g-dimotikou/glossa')
    assert.equal(context.chips.length, 2)
  })

  it('sends a category lesson back to its category', () => {
    const context = categoryLessonContext({ name: 'Παιχνίδια', slug: 'paixnidia' })
    assert.equal(context.parent.to, '/category/paixnidia')
    assert.equal(context.chips[0]?.tone, 'category')
  })
})
