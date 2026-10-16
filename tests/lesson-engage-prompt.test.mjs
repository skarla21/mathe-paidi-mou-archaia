import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  IMAGE_DWELL_MS,
  LESSON_ENGAGE_GUEST_ID,
  PDF_SINGLE_PAGE_DWELL_MS,
  engagementAfterIdentityChange,
  engageDwellMs,
  lessonContentEngagedKey,
  lessonEngagePromptDismissedKey,
  pageMarksEngaged,
  readStorageFlag,
  shouldDismissForCommentRefresh,
  shouldDismissForShare,
  showLessonEngagePrompt,
  writeStorageFlag,
} from '../app/lib/lessonEngageStorage.ts'

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

describe('lesson engage storage keys', () => {
  it('keeps engaged and dismissed flags per reader', () => {
    const lessonId = 'lesson-1'
    const studentA = lessonEngagePromptDismissedKey('user-a', lessonId)
    const studentB = lessonEngagePromptDismissedKey('user-b', lessonId)
    const guest = lessonEngagePromptDismissedKey(LESSON_ENGAGE_GUEST_ID, lessonId)
    assert.notEqual(studentA, studentB)
    assert.notEqual(studentA, guest)
    assert.equal(
      lessonContentEngagedKey('user-a', lessonId),
      'lesson-content-engaged:user-a:lesson-1',
    )

    const storage = memoryStorage()
    writeStorageFlag(storage, studentA)
    assert.equal(readStorageFlag(storage, studentA), true)
    assert.equal(readStorageFlag(storage, studentB), false)
    assert.equal(readStorageFlag(storage, guest), false)
  })

  it('treats a blocked store as unread and does not throw on write', () => {
    const denied = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('quota')
      },
    }
    assert.equal(readStorageFlag(denied, 'lesson-engage-prompt-dismissed:user-a:lesson-1'), false)
    assert.doesNotThrow(() => writeStorageFlag(denied, 'lesson-engage-prompt-dismissed:user-a:lesson-1'))
  })
})

describe('lesson engage prompt visibility', () => {
  const visible = {
    contentEngaged: true,
    dismissed: false,
    canAccess: true,
    canAccessContent: true,
    hasRating: false,
  }

  it('shows the prompt only after engagement, with access, and without a saved rating or dismiss', () => {
    assert.equal(showLessonEngagePrompt(visible), true)
    assert.equal(showLessonEngagePrompt({ ...visible, contentEngaged: false }), false)
    assert.equal(showLessonEngagePrompt({ ...visible, dismissed: true }), false)
    assert.equal(showLessonEngagePrompt({ ...visible, canAccess: false }), false)
    assert.equal(showLessonEngagePrompt({ ...visible, canAccessContent: false }), false)
    assert.equal(showLessonEngagePrompt({ ...visible, hasRating: true }), false)
  })
})

describe('lesson engage dismiss rules', () => {
  it('persists a dismiss only after the prompt comment is actually posted', () => {
    assert.equal(shouldDismissForCommentRefresh('post', true), true)
    assert.equal(shouldDismissForCommentRefresh('post', false), false)
    for (const source of ['reply', 'edit', 'delete']) {
      assert.equal(shouldDismissForCommentRefresh(source, true), false)
      assert.equal(shouldDismissForCommentRefresh(source, false), false)
    }
  })

  it('persists a dismiss only after a share completes while the prompt asked for it', () => {
    assert.equal(shouldDismissForShare({ promptVisible: true, openedFromPrompt: false }), true)
    assert.equal(shouldDismissForShare({ promptVisible: false, openedFromPrompt: true }), true)
    assert.equal(shouldDismissForShare({ promptVisible: false, openedFromPrompt: false }), false)
  })
})

describe('lesson engage identity change', () => {
  it('emits again when the next reader or lesson is already engaged', () => {
    assert.deepEqual(engagementAfterIdentityChange(true), { engagedEmitted: true, emit: true })
    assert.deepEqual(engagementAfterIdentityChange(false), { engagedEmitted: false, emit: false })
  })
})

describe('lesson engage dwell', () => {
  it('waits on a single-page pdf and an image, and marks a later pdf page immediately', () => {
    assert.equal(engageDwellMs('pdf', 1), PDF_SINGLE_PAGE_DWELL_MS)
    assert.equal(engageDwellMs('pdf', 0), null)
    assert.equal(engageDwellMs('pdf', 4), null)
    assert.equal(engageDwellMs('image', 0), IMAGE_DWELL_MS)
    assert.equal(engageDwellMs('other', 1), null)
    assert.equal(pageMarksEngaged(1), false)
    assert.equal(pageMarksEngaged(2), true)
  })
})

describe('lesson engage wiring', () => {
  const view = readFileSync(new URL('../app/components/lesson/LessonView.vue', import.meta.url), 'utf8')
  const comments = readFileSync(new URL('../app/components/lesson/LessonComments.vue', import.meta.url), 'utf8')
  const prompt = readFileSync(new URL('../app/components/lesson/LessonEngagePrompt.vue', import.meta.url), 'utf8')
  const share = readFileSync(new URL('../app/components/ShareDialog.vue', import.meta.url), 'utf8')

  it('does not dismiss from opening share or from a comment list refresh', () => {
    assert.match(view, /shouldDismissForCommentRefresh\(source, engageCommentArmed\.value\)/)
    assert.match(view, /shouldDismissForShare/)
    assert.match(view, /function openShare\(fromPrompt = false\)/)
    assert.doesNotMatch(view, /function openShare\(\) \{\s*if \(showEngagePrompt/)
    assert.match(view, /function onEngageComment\(\) \{\s*engageCommentArmed\.value = true/)
    assert.match(comments, /emit\("refresh", "post"\)/)
    assert.match(comments, /emit\("refresh", "reply"\)/)
    assert.match(comments, /emit\("refresh", "delete"\)/)
    assert.match(comments, /emit\('refresh', 'edit'\)/)
  })

  it('plays the prompt immediately and records share only after copy or a network click', () => {
    assert.match(prompt, /revealNow/)
    assert.doesNotMatch(prompt, /revealSection/)
    assert.match(prompt, /Βαθμολογία πρόσκλησης/)
    assert.match(share, /emit\('shared'\)/)
    assert.match(share, /function shareViaNetwork/)
  })
})
