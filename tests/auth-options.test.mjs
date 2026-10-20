import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  authorizeCredentials,
  getAuthOptions,
  googleSignInResult,
  upsertGoogleUser,
  verifiedGoogleEmail,
} from '../server/utils/authOptions.ts'

const TERMS = '2026-10-20T12:00:00.000Z'

function usersClient(steps) {
  const calls = []
  let step = 0
  function next() {
    const value = steps[step] ?? steps[steps.length - 1]
    step += 1
    return value
  }
  const query = {
    select() {
      return query
    },
    eq(column, value) {
      calls.push(['eq', column, value])
      return query
    },
    insert(row) {
      calls.push(['insert', row])
      return query
    },
    update(row) {
      calls.push(['update', row])
      return query
    },
    maybeSingle() {
      return Promise.resolve(next())
    },
    single() {
      return Promise.resolve(next())
    },
    then(resolve, reject) {
      return Promise.resolve(next()).then(resolve, reject)
    },
  }
  return {
    calls,
    client: {
      from() {
        return query
      },
    },
  }
}

describe('verifiedGoogleEmail', () => {
  it('accepts a verified address and folds it', () => {
    assert.equal(
      verifiedGoogleEmail({ email: '  Anna@Example.com ', email_verified: true }),
      'anna@example.com',
    )
  })

  it('refuses a missing, empty, or unverified address', () => {
    assert.equal(verifiedGoogleEmail(null), null)
    assert.equal(verifiedGoogleEmail('anna@example.com'), null)
    assert.equal(verifiedGoogleEmail({ email: '   ', email_verified: true }), null)
    assert.equal(verifiedGoogleEmail({ email: 1, email_verified: true }), null)
    assert.equal(verifiedGoogleEmail({ email: 'anna@example.com', email_verified: false }), null)
    assert.equal(verifiedGoogleEmail({ email: 'anna@example.com' }), null)
  })
})

describe('googleSignInResult', () => {
  it('redirects an unverified profile, a lookup failure, and a new user without terms', () => {
    assert.equal(
      googleSignInResult({ email: null, existing: null, lookupFailed: false, termsAcceptedAt: TERMS }),
      '/auth/oauth-error?error=UnverifiedEmail',
    )
    assert.equal(
      googleSignInResult({ email: 'a@b.c', existing: null, lookupFailed: true, termsAcceptedAt: TERMS }),
      '/auth/oauth-error?error=Configuration',
    )
    assert.equal(
      googleSignInResult({ email: 'a@b.c', existing: null, lookupFailed: false, termsAcceptedAt: null }),
      '/auth/oauth-error?error=TermsRequired',
    )
  })

  it('allows an existing user and a new user who accepted the terms', () => {
    assert.equal(
      googleSignInResult({ email: 'a@b.c', existing: { id: 'u1' }, lookupFailed: false, termsAcceptedAt: null }),
      true,
    )
    assert.equal(
      googleSignInResult({ email: 'a@b.c', existing: null, lookupFailed: false, termsAcceptedAt: TERMS }),
      true,
    )
  })
})

describe('authorizeCredentials', () => {
  it('returns null before querying when the email or password is empty', async () => {
    let called = false
    const supabase = { from() { called = true } }
    assert.equal(await authorizeCredentials(supabase, '', 'secret'), null)
    assert.equal(await authorizeCredentials(supabase, 'a@b.c', ''), null)
    assert.equal(called, false)
  })

  it('looks up the lowercased email and returns null when the password does not match', async () => {
    const supabase = usersClient([{ data: null, error: null }])
    assert.equal(await authorizeCredentials(supabase.client, 'Anna@Example.com', 'secret'), null)
    assert.deepEqual(supabase.calls[0], ['eq', 'email', 'anna@example.com'])
  })

  it('returns the user when the password matches', async () => {
    const { hashPassword } = await import('../server/utils/password.ts')
    const password_hash = await hashPassword('secret')
    const supabase = usersClient([{
      data: {
        id: 'u1',
        email: 'anna@example.com',
        name: null,
        avatar_url: null,
        isAdmin: 1,
        password_hash,
      },
      error: null,
    }])
    const user = await authorizeCredentials(supabase.client, 'anna@example.com', 'secret')
    assert.equal(user.id, 'u1')
    assert.equal(user.email, 'anna@example.com')
    assert.equal(user.isAdmin, true)
    assert.equal(user.name, undefined)
    assert.equal(user.avatar_url, undefined)
  })
})

describe('upsertGoogleUser', () => {
  it('inserts a new Google user with a verified address and no password', async () => {
    const supabase = usersClient([
      { data: null, error: null },
      { data: { id: 'u1', isAdmin: false, name: 'Άννα', avatar_url: null, email_verified: true }, error: null },
    ])
    const user = await upsertGoogleUser(supabase.client, {
      email: 'Anna@Example.com',
      name: 'Άννα',
      avatarUrl: null,
      termsAcceptedAt: TERMS,
    })
    assert.equal(user.id, 'u1')
    const inserted = supabase.calls.find((call) => call[0] === 'insert')[1]
    assert.equal(inserted.email, 'anna@example.com')
    assert.equal(inserted.provider, 'google')
    assert.equal(inserted.email_verified, true)
    assert.equal(inserted.password_hash, undefined)
    assert.equal(inserted.terms_accepted_at, TERMS)
    assert.equal(supabase.calls.some((call) => call[0] === 'update'), false)
  })

  it('refuses a new user until the terms are accepted', async () => {
    const original = console.error
    console.error = () => {}
    const supabase = usersClient([{ data: null, error: null }])
    await assert.rejects(
      () => upsertGoogleUser(supabase.client, {
        email: 'a@b.c',
        name: null,
        avatarUrl: null,
        termsAcceptedAt: null,
      }),
      (error) => error.message === 'Unable to create Google user',
    )
    assert.equal(supabase.calls.some((call) => call[0] === 'insert'), false)
    console.error = original
  })

  it('keeps the password on a verified address and clears it on an unverified one', async () => {
    const verified = usersClient([
      { data: { id: 'u1', isAdmin: false, name: 'Άννα', avatar_url: null, email_verified: true }, error: null },
      { error: null },
    ])
    await upsertGoogleUser(verified.client, {
      email: 'a@b.c',
      name: 'Άννα',
      avatarUrl: null,
      termsAcceptedAt: TERMS,
    })
    assert.deepEqual(verified.calls.find((call) => call[0] === 'update')[1], { email_verified: true })

    const unverified = usersClient([
      { data: { id: 'u2', isAdmin: false, name: null, avatar_url: null, email_verified: false }, error: null },
      { error: null },
    ])
    await upsertGoogleUser(unverified.client, {
      email: 'b@c.d',
      name: null,
      avatarUrl: null,
      termsAcceptedAt: null,
    })
    assert.deepEqual(unverified.calls.find((call) => call[0] === 'update')[1], {
      email_verified: true,
      password_hash: null,
    })
  })

  it('links the existing row when the insert races', async () => {
    const supabase = usersClient([
      { data: null, error: null },
      { data: null, error: { code: '23505', message: 'duplicate' } },
      { data: { id: 'u3', isAdmin: true, name: 'Νίκη', avatar_url: 'pic', email_verified: false }, error: null },
      { error: null },
    ])
    const user = await upsertGoogleUser(supabase.client, {
      email: 'n@x.gr',
      name: 'Νίκη',
      avatarUrl: 'pic',
      termsAcceptedAt: TERMS,
    })
    assert.equal(user.id, 'u3')
    assert.equal(user.isAdmin, true)
    assert.deepEqual(supabase.calls.find((call) => call[0] === 'update')[1], {
      email_verified: true,
      password_hash: null,
    })
  })

  it('throws when the race cannot find the row, the insert fails, or the update fails', async () => {
    const original = console.error
    console.error = () => {}
    const raced = usersClient([
      { data: null, error: null },
      { data: null, error: { code: '23505', message: 'duplicate' } },
      { data: null, error: { message: 'missing' } },
    ])
    await assert.rejects(
      () => upsertGoogleUser(raced.client, { email: 'a@b.c', name: null, avatarUrl: null, termsAcceptedAt: TERMS }),
      /Unable to create Google user/,
    )

    const failed = usersClient([
      { data: null, error: null },
      { data: null, error: { code: 'XX', message: 'down' } },
    ])
    await assert.rejects(
      () => upsertGoogleUser(failed.client, { email: 'a@b.c', name: null, avatarUrl: null, termsAcceptedAt: TERMS }),
      /Unable to create Google user/,
    )

    const lookup = usersClient([{ data: null, error: { message: 'down' } }])
    await assert.rejects(
      () => upsertGoogleUser(lookup.client, { email: 'a@b.c', name: null, avatarUrl: null, termsAcceptedAt: TERMS }),
      /Unable to create Google user/,
    )

    const update = usersClient([
      { data: { id: 'u1', email_verified: true }, error: null },
      { error: { message: 'no' } },
    ])
    await assert.rejects(
      () => upsertGoogleUser(update.client, { email: 'a@b.c', name: null, avatarUrl: null, termsAcceptedAt: TERMS }),
      /Unable to create Google user/,
    )
    console.error = original
  })
})

describe('auth session', () => {
  it('copies the token onto the session user', async () => {
    globalThis.useRuntimeConfig = () => ({
      authSecret: 'secret',
      googleClientId: '',
      googleClientSecret: '',
    })
    const { callbacks } = getAuthOptions()
    const session = await callbacks.session({
      session: { user: { email: 'a@b.c' } },
      token: { id: 'u1', isAdmin: 1, name: 'Άννα', avatar_url: null },
    })
    assert.equal(session.user.id, 'u1')
    assert.equal(session.user.isAdmin, true)
    assert.equal(session.user.name, 'Άννα')
    assert.equal(session.user.avatar_url, null)

    const created = await callbacks.session({
      session: {},
      token: { id: 'u2', isAdmin: false },
    })
    assert.equal(created.user.id, 'u2')
    assert.equal(created.user.name, null)

    const credentials = await callbacks.jwt({
      token: {},
      user: { id: 'u3', isAdmin: false, name: 'Νίκη', avatar_url: 'pic' },
      account: { provider: 'credentials' },
    })
    assert.equal(credentials.id, 'u3')
    assert.equal(credentials.isAdmin, false)
    assert.equal(credentials.name, 'Νίκη')
    assert.equal(credentials.avatar_url, 'pic')
  })
})
