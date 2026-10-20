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
  it('verifies a real Google address without a verification email', () => {
    const source = readFileSync(new URL('../server/utils/authOptions.ts', import.meta.url), 'utf8')
    const refused = source.indexOf('Google sign-in refused until terms are accepted')
    const insert = source.indexOf('provider: "google"')
    assert.ok(refused !== -1 && insert !== -1 && refused < insert)
    assert.match(source, /email_verified: true/)
    assert.match(source, /terms_accepted_at: termsAcceptedAt/)
    assert.match(source, /email_verified !== true/)
    assert.match(source, /googleAccountLinkUpdate/)
    assert.doesNotMatch(source, /sendVerificationEmail/)
    assert.doesNotMatch(source, /issue_verification_token/)
    assert.doesNotMatch(source, /register_credentials_user/)
  })

  it('shows a Greek message for cancel, an unverified address, and a generic failure', () => {
    const messages = readFileSync(new URL('../shared/utils/googleAuthError.mjs', import.meta.url), 'utf8')
    const page = readFileSync(new URL('../app/pages/auth/oauth-error.vue', import.meta.url), 'utf8')
    const layout = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
    assert.match(messages, /OAuthCallbackError/)
    assert.match(messages, /Η σύνδεση με Google ακυρώθηκε/)
    assert.match(messages, /UnverifiedEmail/)
    assert.match(messages, /Το email της Google δεν είναι επαληθευμένο/)
    assert.match(messages, /Η σύνδεση με Google δεν ήταν δυνατή/)
    assert.match(page, /googleAuth: code/)
    assert.match(layout, /googleAuthErrorMessage\(code\)/)
  })

  it('asks for terms before a Google signup and hides the button until Google is configured', () => {
    const modal = readFileSync(new URL('../app/components/auth/AuthModal.vue', import.meta.url), 'utf8')
    assert.match(modal, /googleEnabled\.value = Boolean\(providers\.google\)/)
    assert.match(modal, /v-if="googleEnabled"/)
    assert.match(modal, /\$fetch\('\/api\/google-terms'/)
  })
})
