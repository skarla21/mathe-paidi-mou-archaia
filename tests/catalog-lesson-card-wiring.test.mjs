import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function walkVue(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkVue(path))
    else if (entry.name.endsWith('.vue')) out.push(path)
  }
  return out
}

function rel(path) {
  return relative(root, path).replaceAll('\\', '/')
}

describe('CatalogLessonList card wiring', () => {
  const consumers = walkVue(join(root, 'app')).filter((path) => {
    const source = readFileSync(path, 'utf8')
    return source.includes('<CatalogLessonList') || source.includes('CatalogLessonList')
  })

  it('finds every page that renders CatalogLessonList', () => {
    assert.deepEqual(
      consumers.map(rel).sort(),
      [
        'app/pages/[grade]/[subject]/[chapter]/index.vue',
        'app/pages/[grade]/[subject]/index.vue',
        'app/pages/category/[categoryId]/index.vue',
        'app/pages/search.vue',
      ].sort(),
    )
  })

  it('forwards preview_url, page/file meta, and bookmarked on every consumer', () => {
    for (const path of consumers) {
      const source = readFileSync(path, 'utf8')
      assert.match(source, /preview_url:\s*lesson\.preview_url/, rel(path))
      assert.match(source, /page_count:\s*lesson\.page_count/, rel(path))
      assert.match(source, /file_bytes:\s*lesson\.file_bytes/, rel(path))
      assert.match(source, /bookmarked:\s*(lesson\.bookmarked|Boolean\(lesson\.bookmarked\))/, rel(path))
    }
  })
})

describe('lesson card data APIs', () => {
  it('GET /api/lessons attaches bookmarks and preview fields', () => {
    const source = readFileSync(join(root, 'server/api/lessons/index.get.ts'), 'utf8')
    assert.match(source, /preview_url/)
    assert.match(source, /page_count/)
    assert.match(source, /file_bytes/)
    assert.match(source, /lesson_bookmarks/)
    assert.match(source, /bookmarked:\s*saved\.has/)
  })

  it('GET /api/search/lessons attaches bookmarks and preview fields', () => {
    const source = readFileSync(join(root, 'server/api/search/lessons.get.ts'), 'utf8')
    assert.match(source, /preview_url/)
    assert.match(source, /page_count/)
    assert.match(source, /file_bytes/)
    assert.match(source, /lesson_bookmarks/)
    assert.match(source, /withLessonSearchBookmarks/)
  })

  it('GET /api/user/bookmarks returns card fields for dashboard', () => {
    const source = readFileSync(join(root, 'server/api/user/bookmarks.get.ts'), 'utf8')
    assert.match(source, /preview_url/)
    assert.match(source, /page_count/)
    assert.match(source, /file_bytes/)
    assert.match(source, /bookmarked:\s*true/)
  })

  it('dashboard ContentCard wires preview and bookmarked', () => {
    const source = readFileSync(join(root, 'app/pages/dashboard.vue'), 'utf8')
    assert.match(source, /:preview-url="lesson\.preview_url"/)
    assert.match(source, /:page-count="lesson\.page_count"/)
    assert.match(source, /:file-bytes="lesson\.file_bytes"/)
    assert.match(source, /:bookmarked="true"/)
  })
})
