import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { faqPageNode } from '../app/utils/jsonLd.ts'

describe('faqPageNode', () => {
  it('lists each question and answer', () => {
    const data = faqPageNode([{ question: 'Τι;', answer: 'Υλικό.' }])
    assert.equal(data['@type'], 'FAQPage')
    assert.equal(data.mainEntity[0].name, 'Τι;')
    assert.equal(data.mainEntity[0].acceptedAnswer.text, 'Υλικό.')
  })
})

describe('terms acceptance is stored', () => {
  it('passes the acceptance time into registration and checkout', () => {
    const register = readFileSync(new URL('../server/api/auth/register.post.ts', import.meta.url), 'utf8')
    const checkout = readFileSync(new URL('../server/api/stripe/checkout.post.ts', import.meta.url), 'utf8')
    const webhook = readFileSync(new URL('../server/api/stripe/webhook.post.ts', import.meta.url), 'utf8')
    assert.match(register, /p_terms_accepted_at/)
    assert.match(checkout, /termsAcceptedAt/)
    assert.match(checkout, /immediateAccessAcceptedAt/)
    assert.match(webhook, /terms_accepted_at/)
    assert.match(webhook, /immediate_access_accepted_at/)
  })
})

describe('article dates ignore likes', () => {
  it('keeps updated_at when only like_count changes', () => {
    const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    const fn = schema.slice(schema.indexOf('function public.set_article_updated_at'))
    assert.match(fn.slice(0, fn.indexOf('$$;')), /new\.updated_at := old\.updated_at/)
  })
})

describe('sitemap paging', () => {
  it('orders every paged query by id', () => {
    const source = readFileSync(new URL('../server/utils/publicSitemap.ts', import.meta.url), 'utf8')
    const orders = source.match(/\.order\('id', \{ ascending: true \}\)/g) ?? []
    assert.equal(orders.length, 6)
  })
})

describe('google signup', () => {
  it('does not insert a user who has not accepted the terms', () => {
    const source = readFileSync(new URL('../server/utils/authOptions.ts', import.meta.url), 'utf8')
    assert.match(source, /Google sign-in refused until terms are accepted/)
    assert.doesNotMatch(source, /provider: "google"/)
  })
})
