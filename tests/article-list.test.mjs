import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { publicArticleList } from '../server/utils/articleList.ts'

describe('publicArticleList', () => {
  it('returns an excerpt and leaves the body off the list', () => {
    const [article] = publicArticleList([
      {
        id: 'a1',
        title: 'Τίτλος',
        slug: 'titlos',
        body: '<p>Πρώτη πρόταση για το άρθρο.</p>',
        tags: ['εκπαίδευση'],
        reading_time_minutes: 2,
        image_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/entity-images/a.png',
        created_at: '2026-01-01',
      },
    ])
    assert.equal(article.excerpt, 'Πρώτη πρόταση για το άρθρο.')
    assert.equal(article.title, 'Τίτλος')
    assert.equal(article.slug, 'titlos')
    assert.deepEqual(article.tags, ['εκπαίδευση'])
    assert.equal(article.reading_time_minutes, 2)
    assert.equal(article.likeCount, 0)
    assert.equal(Object.hasOwn(article, 'body'), false)
  })
})
