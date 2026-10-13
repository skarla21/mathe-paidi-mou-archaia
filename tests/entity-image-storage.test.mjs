import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  entityImagePathFromUrl,
  listEntityImageUrls,
  listReferencedEntityImages,
  reapOrphanEntityImages,
  releaseEntityImages,
  releaseReplacedEntityImage,
  removeUnusedEntityImage,
} from '../server/utils/entityImageStorage.ts'

const SUPABASE_URL = 'https://proj.supabase.co'
const IMAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/category-cover-abcd1234.png`
const NEXT_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/subject-cover-bbbb2222.png`

function fakeImages(tables, objects, { listError = null, queryError = null } = {}) {
  const removed = []
  function queryFor(rows) {
    let filtered = rows
    const query = {
      select() {
        return query
      },
      eq(column, value) {
        filtered = rows.filter((row) => {
          if (typeof row === 'string') return true
          return row[column] === value
        })
        return query
      },
      not() {
        return query
      },
      order() {
        return query
      },
      range(start, end) {
        if (queryError) return Promise.resolve({ data: null, error: queryError })
        const page = filtered.slice(start, end + 1).map((row) => (
          typeof row === 'string' ? { image_url: row } : { ...row }
        ))
        return Promise.resolve({ data: page, error: null })
      },
    }
    return query
  }
  return {
    removed,
    client: {
      from(table) {
        return queryFor(tables[table] ?? [])
      },
      storage: {
        from() {
          return {
            list(prefix, options = {}) {
              if (prefix !== 'entity-images') {
                return Promise.resolve({ data: [], error: null })
              }
              if (listError) return Promise.resolve({ data: null, error: listError })
              const start = options.offset ?? 0
              const limit = options.limit ?? objects.length
              return Promise.resolve({ data: objects.slice(start, start + limit), error: null })
            },
            remove(paths) {
              removed.push(...paths)
              return Promise.resolve({ error: null })
            },
          }
        },
      },
    },
  }
}

describe('entityImagePathFromUrl', () => {
  it('reads an entity image and ignores another origin', () => {
    assert.equal(entityImagePathFromUrl(IMAGE_URL, SUPABASE_URL), 'entity-images/category-cover-abcd1234.png')
    assert.equal(entityImagePathFromUrl('https://cdn.example/cover.png', SUPABASE_URL), null)
    assert.equal(
      entityImagePathFromUrl(`${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/notes.pdf`, SUPABASE_URL),
      null,
    )
  })
})

describe('removeUnusedEntityImage', () => {
  it('keeps an image another record still uses', async () => {
    const supabase = fakeImages({ categories: [IMAGE_URL] }, [])
    await removeUnusedEntityImage(supabase.client, IMAGE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })

  it('removes an image no record uses', async () => {
    const supabase = fakeImages({ categories: ['https://cdn.example/cover.png'] }, [])
    await removeUnusedEntityImage(supabase.client, IMAGE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, ['entity-images/category-cover-abcd1234.png'])
  })

  it('removes nothing when a same-origin url cannot be read', async () => {
    const supabase = fakeImages({
      chapters: [`${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/notes.pdf`],
    }, [])
    await removeUnusedEntityImage(supabase.client, IMAGE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })
})

describe('reapOrphanEntityImages', () => {
  const now = Date.parse('2026-10-06T12:00:00.000Z')
  const staleAt = new Date(now - 16 * 60 * 1000).toISOString()
  const freshAt = new Date(now - 60 * 1000).toISOString()

  it('deletes an old unreferenced image and keeps a referenced or fresh one', async () => {
    const supabase = fakeImages(
      { subjects: [IMAGE_URL], categories: ['https://cdn.example/cover.png'] },
      [
        { name: 'category-cover-abcd1234.png', id: 'kept', created_at: staleAt },
        { name: 'orphan.png', id: 'orphan', created_at: staleAt },
        { name: 'fresh.png', id: 'fresh', created_at: freshAt },
      ],
    )
    await reapOrphanEntityImages(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.removed, ['entity-images/orphan.png'])
  })

  it('deletes nothing when a saved image url on this project cannot be read', async () => {
    const supabase = fakeImages(
      { categories: [`${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/notes.pdf`] },
      [{ name: 'orphan.png', id: 'orphan', created_at: staleAt }],
    )
    await reapOrphanEntityImages(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.removed, [])
  })
})

describe('releaseReplacedEntityImage', () => {
  it('keeps the file when the saved url did not change', async () => {
    const supabase = fakeImages({}, [])
    await releaseReplacedEntityImage(supabase.client, IMAGE_URL, IMAGE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })

  it('removes the previous file when the saved url changes and nothing else uses it', async () => {
    const supabase = fakeImages({ categories: [NEXT_URL] }, [])
    await releaseReplacedEntityImage(supabase.client, IMAGE_URL, '', SUPABASE_URL)
    assert.deepEqual(supabase.removed, ['entity-images/category-cover-abcd1234.png'])
  })

  it('keeps the previous file when another record still uses it', async () => {
    const supabase = fakeImages({ chapters: [IMAGE_URL] }, [])
    await releaseReplacedEntityImage(supabase.client, IMAGE_URL, NEXT_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })

  it('keeps a file shared by a subject and a chapter when the subject releases it', async () => {
    const supabase = fakeImages({ subjects: [NEXT_URL], chapters: [IMAGE_URL] }, [])
    await releaseReplacedEntityImage(supabase.client, IMAGE_URL, NEXT_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })
})

describe('releaseEntityImages', () => {
  it('removes each unused image once', async () => {
    const supabase = fakeImages({}, [])
    await releaseEntityImages(supabase.client, [IMAGE_URL, IMAGE_URL, null, ''], SUPABASE_URL)
    assert.deepEqual(supabase.removed, ['entity-images/category-cover-abcd1234.png'])
  })
})

describe('listEntityImageUrls', () => {
  it('reads the image urls for one subject and skips an empty one', async () => {
    const supabase = fakeImages({
      chapters: [
        { subject_id: 'sub-1', image_url: IMAGE_URL },
        { subject_id: 'sub-1', image_url: null },
        { subject_id: 'sub-2', image_url: NEXT_URL },
      ],
    }, [])
    const urls = await listEntityImageUrls(supabase.client, 'chapters', 'subject_id', 'sub-1')
    assert.deepEqual(urls, [IMAGE_URL])
  })

  it('returns null when the image lookup fails', async () => {
    const supabase = fakeImages({ categories: [] }, [], { queryError: { message: 'db down' } })
    const urls = await listEntityImageUrls(supabase.client, 'categories', 'id', 'cat-1')
    assert.equal(urls, null)
  })

  it('pages through every image url for that grade', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      grade_id: 'grade-1',
      image_url: `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/img-${index}.png`,
    }))
    const supabase = fakeImages({ subjects: rows }, [])
    const urls = await listEntityImageUrls(supabase.client, 'subjects', 'grade_id', 'grade-1')
    assert.equal(urls.length, 1001)
    assert.equal(urls[0], rows[0].image_url)
    assert.equal(urls[1000], rows[1000].image_url)
  })
})

describe('listReferencedEntityImages', () => {
  const THIRD_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/category-extra.png`
  const shared = {
    subjects: [
      { id: 'sub-shared', name: 'Αρχαία', image_url: IMAGE_URL, grades: { name: 'Α' } },
      { id: 'sub-only', name: 'Γραμματική', image_url: NEXT_URL, grades: { name: 'Β' } },
    ],
    chapters: [
      {
        id: 'ch-shared',
        title: 'Συντακτικό',
        image_url: `${IMAGE_URL}?download=1`,
        subjects: { name: 'Αρχαία', grades: { name: 'Α' } },
      },
    ],
    categories: [
      { id: 'cat-ok', name: 'Λεξιλόγιο', image_url: THIRD_URL },
      { id: 'cat-bad', name: 'Κακή', image_url: `${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/notes.pdf` },
      { id: 'cat-foreign', name: 'Ξένη', image_url: 'https://cdn.example/cover.png' },
      { id: 'cat-empty', name: 'Κενή', image_url: null },
    ],
  }

  it('groups one storage path and skips an image url that cannot be read', async () => {
    const supabase = fakeImages(shared, [])
    const images = await listReferencedEntityImages(supabase.client, SUPABASE_URL)
    assert.deepEqual(images, [
      {
        url: IMAGE_URL,
        usedBy: [
          { type: 'subject', id: 'sub-shared', label: 'Α > Αρχαία' },
          { type: 'chapter', id: 'ch-shared', label: 'Α > Αρχαία > Συντακτικό' },
        ],
      },
      {
        url: NEXT_URL,
        usedBy: [{ type: 'subject', id: 'sub-only', label: 'Β > Γραμματική' }],
      },
      {
        url: THIRD_URL,
        usedBy: [{ type: 'category', id: 'cat-ok', label: 'Λεξιλόγιο' }],
      },
    ])
  })

  it('hides an image used only by the excluded row', async () => {
    const supabase = fakeImages(shared, [])
    const images = await listReferencedEntityImages(supabase.client, SUPABASE_URL, {
      type: 'subject',
      id: 'sub-only',
    })
    assert.deepEqual(images, [
      {
        url: IMAGE_URL,
        usedBy: [
          { type: 'subject', id: 'sub-shared', label: 'Α > Αρχαία' },
          { type: 'chapter', id: 'ch-shared', label: 'Α > Αρχαία > Συντακτικό' },
        ],
      },
      {
        url: THIRD_URL,
        usedBy: [{ type: 'category', id: 'cat-ok', label: 'Λεξιλόγιο' }],
      },
    ])
  })

  it('keeps a shared image after excluding one of its rows', async () => {
    const supabase = fakeImages(shared, [])
    const images = await listReferencedEntityImages(supabase.client, SUPABASE_URL, {
      type: 'subject',
      id: 'sub-shared',
    })
    assert.deepEqual(images, [
      {
        url: IMAGE_URL,
        usedBy: [{ type: 'chapter', id: 'ch-shared', label: 'Α > Αρχαία > Συντακτικό' }],
      },
      {
        url: NEXT_URL,
        usedBy: [{ type: 'subject', id: 'sub-only', label: 'Β > Γραμματική' }],
      },
      {
        url: THIRD_URL,
        usedBy: [{ type: 'category', id: 'cat-ok', label: 'Λεξιλόγιο' }],
      },
    ])
  })

  it('returns null when the image lookup fails', async () => {
    const supabase = fakeImages({ categories: [] }, [], { queryError: { message: 'db down' } })
    const images = await listReferencedEntityImages(supabase.client, SUPABASE_URL)
    assert.equal(images, null)
  })

  it('pages through every referenced image', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      id: `sub-${index}`,
      name: `Μάθημα ${index}`,
      image_url: `${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/img-${index}.png`,
    }))
    const supabase = fakeImages({ subjects: rows }, [])
    const images = await listReferencedEntityImages(supabase.client, SUPABASE_URL)
    assert.equal(images.length, 1001)
    assert.equal(images.some((image) => image.url.endsWith('/entity-images/img-0.png')), true)
    assert.equal(images.some((image) => image.url.endsWith('/entity-images/img-1000.png')), true)
  })
})
