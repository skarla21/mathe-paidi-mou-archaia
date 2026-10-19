import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function read(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('auth dialog routes', () => {
  it('redirects /login and /register into the home dialog', () => {
    assert.equal(existsSync(new URL('../app/pages/login.vue', import.meta.url)), false)
    assert.equal(existsSync(new URL('../app/pages/register.vue', import.meta.url)), false)

    const config = read('../nuxt.config.ts')
    assert.match(config, /'\/login': \{ redirect: '\/\?auth=login' \}/)
    assert.match(config, /'\/register': \{ redirect: '\/\?auth=register' \}/)

    const layout = read('../app/layouts/default.vue')
    assert.match(layout, /authDialogQuery\(route\.query\.auth\)/)
    assert.match(layout, /delete query\.auth/)
    assert.match(layout, /navigateTo\(\{ path: route\.path, query \}, \{ replace: true \}\)/)
    assert.match(layout, /openRegister\(redirectTo\)/)
    assert.match(layout, /openLogin\(redirectTo\)/)
  })
})

describe('reset password landing', () => {
  it('replaces the used reset link instead of leaving it in history', () => {
    const page = read('../app/pages/reset-password.vue')
    const replacements = page.match(/navigateTo\("\/", \{ replace: true \}\)/g)

    assert.equal(replacements?.length, 2)
    assert.doesNotMatch(page, /navigateTo\("\/"\)/)
    assert.doesNotMatch(page, /navigateTo\("\/login"\)/)
  })

  it('opens login when auto sign-in does not create a session', () => {
    const page = read('../app/pages/reset-password.vue')
    assert.match(page, /if \(!result\.email \|\| !\(await signInWithNewPassword\(result\.email, password\)\)\)/)
    assert.match(page, /if \(!session\.value\.user\?\.id\)/)
    assert.match(page, /await finishWithoutSession\(\)/)
    assert.match(page, /await openLogin\("\/"\)/)

    const modal = read('../app/composables/useAuthModal.ts')
    assert.match(modal, /async function openLogin\(redirectTo\?: string\)/)
    assert.match(modal, /if \(await sessionStillValid\(\)\) return false/)
  })
})
