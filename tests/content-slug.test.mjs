import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  nextArticleSlug,
  nextCategorySlug,
  nextChapterSlug,
  nextGradeSlug,
  nextLessonSlug,
  nextSubjectSlug,
  stableLessonSlug,
} from '../server/utils/contentSlug.ts'

globalThis.createError = (error) => Object.assign(new Error(error.message), error)

function thenable(result) {
  const builder = {
    eq() {
      return builder
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  return builder
}

function slugSupabase(handlers) {
  const calls = []
  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        return {
          select(columns) {
            calls.push(['select', table, columns])
            const handler = handlers[table]
            if (typeof handler === 'function') {
              return handler(columns, calls, thenable)
            }
            return thenable(handler ?? { data: [], error: null })
          },
        }
      },
    },
  }
}

describe('content slug helpers', () => {
  it('throws a 500 with the Greek server message when a query fails', async () => {
    const { client } = slugSupabase({
      grades: { data: null, error: { message: 'db down' } },
    })
    await assert.rejects(
      () => nextGradeSlug(client, 'Τάξη', undefined),
      (error) => error.statusCode === 500 && error.message === 'Κάτι πήγε στραβά',
    )
  })

  it('ignores the exceptId row when collecting taken slugs', async () => {
    const { client } = slugSupabase({
      grades: {
        data: [{ id: 'g1', slug: 'alfa' }],
        error: null,
      },
    })
    const slug = await nextGradeSlug(client, 'Άλφα', 'g1')
    assert.equal(slug, 'alfa')
  })

  it('falls back to the reserved grade base slug for a blank name', async () => {
    const { client } = slugSupabase({ grades: { data: [], error: null } })
    const slug = await nextGradeSlug(client, '', undefined)
    assert.equal(slug, 'grade')
  })

  it('filters subjects by grade_id and falls back to subject for a blank name', async () => {
    const eqCalls = []
    const subjectClient = {
      from(table) {
        assert.equal(table, 'subjects')
        return {
          select() {
            const builder = {
              eq(column, value) {
                eqCalls.push([column, value])
                return builder
              },
              then(resolve) {
                return resolve({
                  data: [{ id: 's1', slug: 'subject' }],
                  error: null,
                })
              },
            }
            return builder
          },
        }
      },
    }
    assert.equal(await nextSubjectSlug(subjectClient, '', 'grade-1', undefined), 'subject-2')
    assert.deepEqual(eqCalls, [['grade_id', 'grade-1']])
  })

  it('queries chapters by subject_id', async () => {
    const eqCalls = []
    const client = {
      from(table) {
        assert.equal(table, 'chapters')
        return {
          select() {
            const builder = {
              eq(column, value) {
                eqCalls.push([column, value])
                return builder
              },
              then(resolve) {
                return resolve({ data: [], error: null })
              },
            }
            return builder
          },
        }
      },
    }
    assert.equal(await nextChapterSlug(client, 'Ενότητα', 'sub-1', undefined), 'enotita')
    assert.deepEqual(eqCalls, [['subject_id', 'sub-1']])
  })

  it('does not query lesson placements without a parent id', async () => {
    let eqUsed = false
    let awaited = false
    const client = {
      from(table) {
        assert.equal(table, 'lesson_placements')
        return {
          select() {
            const builder = {
              eq() {
                eqUsed = true
                return builder
              },
              then(resolve) {
                awaited = true
                return resolve({ data: [], error: null })
              },
            }
            return builder
          },
        }
      },
    }
    const slug = await nextLessonSlug(client, 'Μάθημα', [{}], undefined)
    assert.equal(eqUsed, false)
    assert.equal(awaited, false)
    assert.equal(slug, 'mathima')
  })

  it('skips exceptLessonId when collecting taken lesson slugs', async () => {
    const client = {
      from(table) {
        assert.equal(table, 'lesson_placements')
        return {
          select() {
            const builder = {
              eq() {
                return builder
              },
              then(resolve) {
                return resolve({
                  data: [{
                    lesson_id: 'keep-me',
                    lessons: { slug: 'taken-slug' },
                  }],
                  error: null,
                })
              },
            }
            return builder
          },
        }
      },
    }
    const slug = await nextLessonSlug(
      client,
      'taken-slug',
      [{ subject_id: 'sub-1' }],
      'keep-me',
    )
    assert.equal(slug, 'taken-slug')
  })

  it('reads embedded lesson slugs from an object or a one-element array', async () => {
    const client = {
      from() {
        return {
          select() {
            const builder = {
              eq() {
                return builder
              },
              then(resolve) {
                return resolve({
                  data: [
                    { lesson_id: 'l1', lessons: { slug: 'alpha' } },
                    { lesson_id: 'l2', lessons: [{ slug: 'beta' }] },
                  ],
                  error: null,
                })
              },
            }
            return builder
          },
        }
      },
    }
    const slug = await stableLessonSlug(client, 'beta', [{ chapter_id: 'ch-1' }], undefined)
    assert.equal(slug, 'beta-2')
  })

  it('does not call eq when loading grade slugs', async () => {
    let eqUsed = false
    const client = {
      from(table) {
        assert.equal(table, 'grades')
        return {
          select() {
            const builder = {
              eq() {
                eqUsed = true
                return builder
              },
              then(resolve) {
                return resolve({ data: [], error: null })
              },
            }
            return builder
          },
        }
      },
    }
    await nextGradeSlug(client, 'Α', undefined)
    assert.equal(eqUsed, false)
  })

  it('generates unique slugs for categories and articles', async () => {
    const tables = {
      categories: { data: [{ id: 'c1', slug: 'category' }], error: null },
      articles: { data: [], error: null },
    }
    const { client } = slugSupabase(tables)
    assert.equal(await nextCategorySlug(client, '', undefined), 'category-2')
    assert.equal(await nextArticleSlug(client, 'Άρθρο', undefined), 'arthro')
  })
})
