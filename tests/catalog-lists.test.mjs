import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { catalogListState, subjectCatalogView } from '../app/utils/catalogLists.ts'

const subjectPage = readFileSync(new URL('../app/pages/[grade]/[subject]/index.vue', import.meta.url), 'utf8')
const gradePage = readFileSync(new URL('../app/pages/[grade]/index.vue', import.meta.url), 'utf8')
const chapterPage = readFileSync(new URL('../app/pages/[grade]/[subject]/[chapter]/index.vue', import.meta.url), 'utf8')
const categoryPage = readFileSync(new URL('../app/pages/category/[categoryId]/index.vue', import.meta.url), 'utf8')

describe('subjectCatalogView', () => {
  it('calls direct lessons material when the subject has no chapters', () => {
    const view = subjectCatalogView({
      chaptersFailed: false,
      chapterCount: 0,
      lessonsFailed: false,
      lessonCount: 2,
    })
    assert.equal(view.showLessons, true)
    assert.equal(view.lessonHeading, 'Υλικό')
    assert.equal(view.emptyMessage, '')
  })

  it('calls direct lessons other material only beside chapters', () => {
    const view = subjectCatalogView({
      chaptersFailed: false,
      chapterCount: 1,
      lessonsFailed: false,
      lessonCount: 1,
    })
    assert.equal(view.lessonHeading, 'Άλλο υλικό')
  })

  it('uses one failure message when both lists fail', () => {
    const view = subjectCatalogView({
      chaptersFailed: true,
      chapterCount: 0,
      lessonsFailed: true,
      lessonCount: 0,
    })
    assert.equal(view.blockedMessage, 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.')
    assert.equal(view.emptyMessage, '')
    assert.equal(view.chaptersMessage, '')
    assert.equal(view.lessonsMessage, '')
  })

  it('names the list that failed and keeps the list that loaded', () => {
    const chaptersFailed = subjectCatalogView({
      chaptersFailed: true,
      chapterCount: 0,
      lessonsFailed: false,
      lessonCount: 1,
    })
    assert.equal(chaptersFailed.chaptersMessage, 'Τα κεφάλαια δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.')
    assert.equal(chaptersFailed.showLessons, true)
    assert.equal(chaptersFailed.lessonHeading, 'Υλικό')

    const lessonsFailed = subjectCatalogView({
      chaptersFailed: false,
      chapterCount: 2,
      lessonsFailed: true,
      lessonCount: 0,
    })
    assert.equal(lessonsFailed.showChapters, true)
    assert.equal(lessonsFailed.lessonsMessage, 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.')
  })

  it('shows the empty subject only after both lists succeed empty', () => {
    const view = subjectCatalogView({
      chaptersFailed: false,
      chapterCount: 0,
      lessonsFailed: false,
      lessonCount: 0,
    })
    assert.equal(view.emptyMessage, 'Δεν υπάρχει ακόμη υλικό σε αυτό το μάθημα.')
  })
})

describe('catalogListState', () => {
  it('distinguishes a failed load from an empty catalog', () => {
    assert.equal(catalogListState(true, 0), 'error')
    assert.equal(catalogListState(false, 0), 'empty')
    assert.equal(catalogListState(true, 2), 'ready')
  })
})

describe('catalog pages', () => {
  it('uses the subject view for the lesson heading and the failure messages', () => {
    assert.match(subjectPage, /subjectCatalogView/)
    assert.match(subjectPage, /catalog\.lessonHeading/)
    assert.doesNotMatch(subjectPage, /Άλλο Υλικό/)
  })

  it('shows a load failure instead of an empty catalog', () => {
    assert.match(gradePage, /catalogListState/)
    assert.match(gradePage, /Τα μαθήματα δεν φορτώθηκαν/)
    assert.match(chapterPage, /catalogListState/)
    assert.match(chapterPage, /Το υλικό δεν φορτώθηκε/)
    assert.match(categoryPage, /catalogListState/)
    assert.match(categoryPage, /Το υλικό δεν φορτώθηκε/)
  })
})
