import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applySocialMeta, describedHead } from '../app/utils/socialHead.ts'

describe('describedHead', () => {
  it('omits an empty description so the site fallback can stay', () => {
    assert.deepEqual(describedHead('Μάθημα', '   '), {
      title: 'Μάθημα',
      meta: [],
    })
  })

  it('emits a canonical link and drops the query string', () => {
    const head = describedHead('Κείμενο', 'Περίληψη', [], '/articles/keimeno?page=2')
    assert.deepEqual(head.link, [
      { rel: 'canonical', href: 'https://mathearchaia.gr/articles/keimeno' },
    ])
    assert.deepEqual(head.meta, [
      { name: 'description', content: 'Περίληψη' },
      { property: 'og:url', content: 'https://mathearchaia.gr/articles/keimeno' },
    ])
  })

  it('keeps a short description and extra tags', () => {
    assert.deepEqual(describedHead('Κείμενο', 'Περίληψη', [
      { property: 'og:type', content: 'article' },
    ]), {
      title: 'Κείμενο',
      meta: [
        { name: 'description', content: 'Περίληψη' },
        { property: 'og:type', content: 'article' },
      ],
    })
  })

  it('clips a long description on a word boundary when a space sits past sixty percent', () => {
    const description = `${'α'.repeat(100)} ${'β'.repeat(100)}`
    const head = describedHead('Τίτλος', description)
    const content = head.meta.find((tag) => tag.name === 'description')?.content
    assert.ok(content.endsWith('…'))
    assert.equal(content.includes('β'), false)
    assert.equal(content.length, 101)
  })

  it('hard-cuts at one hundred sixty characters when the first space is too early', () => {
    const description = `${'α'.repeat(50)} ${'β'.repeat(200)}`
    const head = describedHead('Τίτλος', description)
    const content = head.meta.find((tag) => tag.name === 'description')?.content
    assert.ok(content.endsWith('…'))
    assert.equal(content.length, 161)
    assert.equal(content.startsWith(`${'α'.repeat(50)} ${'β'.repeat(109)}`), true)
  })
})

describe('applySocialMeta', () => {
  it('copies the page title and description onto the social tags', () => {
    const title = { tag: 'title', textContent: 'Κεφάλαιο Α' }
    const description = {
      tag: 'meta',
      props: { name: 'description', content: 'Η περίληψη του κεφαλαίου' },
    }
    const ogTitle = { tag: 'meta', props: { property: 'og:title', content: 'Αρχική' } }
    const ctx = {
      tagMap: new Map([
        ['title', title],
        ['meta:description', description],
        ['meta:og:title', ogTitle],
      ]),
      tags: [title, description, ogTitle],
    }

    applySocialMeta(ctx)

    assert.equal(ogTitle.props.content, 'Κεφάλαιο Α')
    assert.equal(ctx.tagMap.get('meta:twitter:title').props.content, 'Κεφάλαιο Α')
    assert.equal(ctx.tagMap.get('meta:og:description').props.content, 'Η περίληψη του κεφαλαίου')
    assert.equal(ctx.tagMap.get('meta:twitter:description').props.content, 'Η περίληψη του κεφαλαίου')
    assert.equal(ctx.tagMap.get('meta:twitter:card').props.content, 'summary')
    assert.equal(ctx.tags.length, 7)
  })

  it('leaves social descriptions unset when the page has no description', () => {
    const title = { tag: 'title', textContent: 'Άρθρα' }
    const ctx = {
      tagMap: new Map([['title', title]]),
      tags: [title],
    }

    applySocialMeta(ctx)

    assert.equal(ctx.tagMap.has('meta:og:description'), false)
    assert.equal(ctx.tagMap.get('meta:og:title').props.content, 'Άρθρα')
  })
})
