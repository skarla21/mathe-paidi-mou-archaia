import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const ratingsGet = readFileSync(
  new URL('../server/api/admin/lessons/[id]/ratings.get.ts', import.meta.url),
  'utf8',
)
const lessonModal = readFileSync(
  new URL('../app/components/admin/LessonDetailModal.vue', import.meta.url),
  'utf8',
)
const adminLessons = readFileSync(
  new URL('../server/utils/adminLessons.ts', import.meta.url),
  'utf8',
)
const adminDetailPage = readFileSync(
  new URL('../server/utils/adminDetailPage.ts', import.meta.url),
  'utf8',
)
const lessonsIndex = readFileSync(
  new URL('../server/api/lessons/index.get.ts', import.meta.url),
  'utf8',
)
const sortModal = readFileSync(
  new URL('../app/components/admin/AdminSortModal.vue', import.meta.url),
  'utf8',
)
const detailTab = readFileSync(
  new URL('../app/composables/useAdminDetailTab.ts', import.meta.url),
  'utf8',
)
const articleComments = readFileSync(
  new URL('../app/components/article/ArticleComments.vue', import.meta.url),
  'utf8',
)

describe('review fixes', () => {
  it('returns averageRating for the whole lesson, not the paged slice', () => {
    assert.match(ratingsGet, /averageRating/)
    assert.match(lessonModal, /averageRating/)
    assert.doesNotMatch(
      lessonModal,
      /ratingsTab\.items\.reduce\(\(acc, r\) => acc \+ r\.rating/,
    )
  })

  it('fails admin lesson list when ratings cannot load', () => {
    assert.match(
      adminLessons,
      /ratingsRes\.error[\s\S]*throw createError/,
    )
  })

  it('hides database error text from admin detail clients', () => {
    assert.match(adminDetailPage, /Database operation failed/)
    assert.doesNotMatch(
      adminDetailPage,
      /message:\s*error\.message/,
    )
  })

  it('flags truncated admin reorder lists', () => {
    assert.match(lessonsIndex, /truncated/)
    assert.match(sortModal, /truncated/)
  })

  it('reloads the clamped page inside useAdminDetailTab', () => {
    assert.match(detailTab, /page\.value = last/)
    assert.match(detailTab, /result = await fetcher\(page\.value\)/)
    assert.doesNotMatch(detailTab, /page\.value = last\s*\n\s*return/)
  })

  it('places load-more above the comment list', () => {
    const template = articleComments.slice(articleComments.indexOf('<template>'))
    const loadMoreAt = template.indexOf('v-if="hasMore"')
    const listAt = template.indexOf('v-if="threads.length"')
    assert.ok(loadMoreAt > 0 && listAt > 0)
    assert.ok(loadMoreAt < listAt)
  })
})
