import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonicalLessonPaths, chapterPublicPath, lessonPathFromPlacement } from '../server/utils/contentPath.ts'

globalThis.createError = (error) => Object.assign(new Error(error.message), error)

describe('lessonPathFromPlacement', () => {
  it('prefers a chapter path over a subject or category path', () => {
    const path = lessonPathFromPlacement({
      lesson_id: 'l1',
      order: 0,
      chapter_id: 'c1',
      subject_id: 's1',
      category_id: 'k1',
      lessons: { slug: 'keimeno' },
      chapters: { slug: 'enotita', subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } } },
      subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } },
      categories: { slug: 'extra' },
    })
    assert.equal(path, '/a-lykeiou/archaia/enotita/keimeno')
  })

  it('uses the subject lesson route when there is no chapter', () => {
    const path = lessonPathFromPlacement({
      lesson_id: 'l1',
      order: 1,
      chapter_id: null,
      subject_id: 's1',
      category_id: null,
      lessons: { slug: 'keimeno' },
      chapters: null,
      subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } },
      categories: null,
    })
    assert.equal(path, '/a-lykeiou/archaia/lesson/keimeno')
  })

  it('uses the category route when that is the only placement', () => {
    const path = lessonPathFromPlacement({
      lesson_id: 'l1',
      order: 0,
      chapter_id: null,
      subject_id: null,
      category_id: 'k1',
      lessons: { slug: 'keimeno' },
      chapters: null,
      subjects: null,
      categories: { slug: 'extra' },
    })
    assert.equal(path, '/category/extra/keimeno')
  })

  it('returns null when a slug in the chain is missing', () => {
    assert.equal(lessonPathFromPlacement({
      lesson_id: 'l1',
      order: 0,
      chapter_id: 'c1',
      subject_id: null,
      category_id: null,
      lessons: { slug: 'keimeno' },
      chapters: { slug: null, subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } } },
      subjects: null,
      categories: null,
    }), null)
  })
})

describe('chapterPublicPath', () => {
  it('builds the nested grade path', () => {
    assert.equal(
      chapterPublicPath({ slug: 'enotita', subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } } }),
      '/a-lykeiou/archaia/enotita',
    )
  })

  it('returns null when the grade slug is missing', () => {
    assert.equal(
      chapterPublicPath({ slug: 'enotita', subjects: { slug: 'archaia', grades: { slug: null } } }),
      null,
    )
  })
})

describe('canonicalLessonPaths', () => {
  it('returns an empty map without querying when there are no lesson ids', async () => {
    let queried = false
    const supabase = {
      from() {
        queried = true
        return {}
      },
    }
    const paths = await canonicalLessonPaths(supabase, [])
    assert.deepEqual([...paths.entries()], [])
    assert.equal(queried, false)
  })

  it('throws when the placement query fails', async () => {
    const supabase = {
      from() {
        return {
          select() {
            return this
          },
          in() {
            return Promise.resolve({ data: null, error: { message: 'db down' } })
          },
        }
      },
    }
    await assert.rejects(
      () => canonicalLessonPaths(supabase, ['l1']),
      (error) => error.statusCode === 500 && error.message === 'Κάτι πήγε στραβά',
    )
  })

  it('prefers a chapter placement and skips rows without a public path', async () => {
    const rows = [
      {
        lesson_id: 'l1',
        order: 0,
        chapter_id: null,
        subject_id: 's1',
        category_id: null,
        lessons: { slug: 'keimeno' },
        chapters: null,
        subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } },
        categories: null,
      },
      {
        lesson_id: 'l1',
        order: 1,
        chapter_id: 'c1',
        subject_id: null,
        category_id: null,
        lessons: { slug: 'keimeno' },
        chapters: { slug: 'enotita', subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } } },
        subjects: null,
        categories: null,
      },
      {
        lesson_id: 'l2',
        order: 0,
        chapter_id: 'c-bad',
        subject_id: null,
        category_id: null,
        lessons: { slug: 'keimeno' },
        chapters: { slug: null, subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } } },
        subjects: null,
        categories: null,
      },
      {
        lesson_id: 'l2',
        order: 1,
        chapter_id: null,
        subject_id: null,
        category_id: 'k1',
        lessons: { slug: 'keimeno' },
        chapters: null,
        subjects: null,
        categories: { slug: 'extra' },
      },
    ]
    const supabase = {
      from(table) {
        assert.equal(table, 'lesson_placements')
        return {
          select() {
            return this
          },
          in(_column, ids) {
            assert.deepEqual(ids, ['l1', 'l2'])
            return Promise.resolve({ data: rows.filter((row) => ids.includes(row.lesson_id)), error: null })
          },
        }
      },
    }
    const paths = await canonicalLessonPaths(supabase, ['l1', 'l2'])
    assert.equal(paths.get('l1'), '/a-lykeiou/archaia/enotita/keimeno')
    assert.equal(paths.get('l2'), '/category/extra/keimeno')
  })
})
