import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { publicLessonList } from '../shared/utils/publicLessonList.mjs'

describe('publicLessonList', () => {
  it('returns an excerpt and leaves the description and file off the list', () => {
    const [lesson] = publicLessonList([
      {
        order: 2,
        lessons: {
          id: 'lesson-1',
          slug: 'proto',
          title: 'Πρώτο',
          content: '<p>Περιγραφή μαθήματος</p>',
          content_url: 'https://secret.example/file.pdf',
          preview_url: 'https://cdn.example/preview.png',
          page_count: 3,
          file_bytes: 1400000,
          is_free: false,
          price: 500,
          created_at: '2026-01-01',
        },
      },
    ])
    assert.equal(lesson.excerpt, 'Περιγραφή μαθήματος')
    assert.equal(lesson.order, 2)
    assert.equal(lesson.title, 'Πρώτο')
    assert.equal(lesson.is_free, false)
    assert.equal(lesson.preview_url, 'https://cdn.example/preview.png')
    assert.equal(lesson.page_count, 3)
    assert.equal(lesson.file_bytes, 1400000)
    assert.equal(Object.hasOwn(lesson, 'content'), false)
    assert.equal(Object.hasOwn(lesson, 'content_url'), false)
  })

  it('reads a lesson nested in an array and skips a placement without one', () => {
    const lessons = publicLessonList([
      { order: 0, lessons: [{ id: 'a', title: 'Α', content: 'Κείμενο' }] },
      { order: 1, lessons: null },
    ])
    assert.equal(lessons.length, 1)
    assert.equal(lessons[0].excerpt, 'Κείμενο')
    assert.equal(Object.hasOwn(lessons[0], 'content'), false)
  })
})
