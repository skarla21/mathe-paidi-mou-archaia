import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { chapterSlug, gradeSlug, RESERVED_GRADE_SLUGS, slugifyGreek, stableSlug, uniqueSlug } from '../shared/utils/slugify.mjs'

function reservedGradeSlugs(sql) {
  const start = sql.indexOf('function public.reject_reserved_grade_slug')
  const fn = sql.slice(start)
  const body = fn.slice(0, fn.indexOf('$$;'))
  const array = body.match(/array\[([\s\S]*?)\]/)
  if (!array) throw new Error('reserved slug array missing')
  return [...array[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
}

describe('slugifyGreek', () => {
  it('spells the steady grade names with ELOT 743', () => {
    assert.equal(slugifyGreek("Γ' Δημοτικού"), 'g-dimotikou')
    assert.equal(slugifyGreek("Δ' Δημοτικού"), 'd-dimotikou')
    assert.equal(slugifyGreek("Ε' Δημοτικού"), 'e-dimotikou')
    assert.equal(slugifyGreek("ΣΤ' Δημοτικού"), 'st-dimotikou')
    assert.equal(slugifyGreek("Α' Γυμνασίου"), 'a-gymnasiou')
    assert.equal(slugifyGreek("Β' Γυμνασίου"), 'v-gymnasiou')
    assert.equal(slugifyGreek("Γ' Γυμνασίου"), 'g-gymnasiou')
    assert.equal(slugifyGreek("Α' Λυκείου"), 'a-lykeiou')
    assert.equal(slugifyGreek("Β' Λυκείου"), 'v-lykeiou')
    assert.equal(slugifyGreek("Γ' Λυκείου"), 'g-lykeiou')
  })

  it('slugifies Greek, English, and mixed names', () => {
    assert.equal(slugifyGreek('Αρχαία Ελληνικά'), 'archaia-ellinika')
    assert.equal(slugifyGreek('Γραμματική'), 'grammatiki')
    assert.equal(slugifyGreek('Συντακτικό'), 'syntaktiko')
    assert.equal(slugifyGreek('Ancient Greek Grammar'), 'ancient-greek-grammar')
    assert.equal(slugifyGreek('Lesson Αρχαία'), 'lesson-archaia')
  })

  it('adds a numeric suffix only when the slug is already taken', () => {
    assert.equal(uniqueSlug('lesson1', []), 'lesson1')
    assert.equal(uniqueSlug('lesson1', ['lesson1']), 'lesson1-2')
    assert.equal(uniqueSlug('lesson1', ['lesson1', 'lesson1-2']), 'lesson1-3')
  })
})

describe('stableSlug', () => {
  it('keeps the current slug when it is still free', () => {
    assert.equal(stableSlug('archaia', []), 'archaia')
    assert.equal(stableSlug('archaia', ['grammatiki']), 'archaia')
  })

  it('suffixes the current slug when that exact value is taken', () => {
    assert.equal(stableSlug('archaia', ['archaia']), 'archaia-2')
    assert.equal(stableSlug('archaia', ['archaia', 'archaia-2']), 'archaia-3')
  })
})

describe('chapterSlug', () => {
  it('never uses the reserved lesson segment', () => {
    assert.equal(chapterSlug('lesson', []), 'lesson-2')
    assert.equal(chapterSlug('lesson', ['lesson-2']), 'lesson-3')
    assert.equal(chapterSlug('eisagogi', []), 'eisagogi')
  })
})

describe('gradeSlug', () => {
  it('never uses a reserved top-level route', () => {
    assert.equal(gradeSlug('login', []), 'login-2')
    assert.equal(gradeSlug('grade', []), 'grade')
    assert.equal(gradeSlug('a-gymnasiou', []), 'a-gymnasiou')
  })

  it('reserves every static top-level page', () => {
    const pageNames = readdirSync(new URL('../app/pages', import.meta.url))
      .filter((name) => !name.startsWith('[') && name !== 'index.vue')
      .map((name) => name.replace(/\.vue$/, ''))
    for (const name of pageNames) {
      assert.equal(gradeSlug(name, []), `${name}-2`, name)
    }
    assert.equal(gradeSlug('api', []), 'api-2')
  })

  it('keeps the database rule aligned with the reserved list', () => {
    const migration = readFileSync(new URL('../supabase/migrations/20261020160000_terms_acceptance_article_dates_oroi.sql', import.meta.url), 'utf8')
    const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    assert.deepEqual(reservedGradeSlugs(migration), [...RESERVED_GRADE_SLUGS])
    assert.deepEqual(reservedGradeSlugs(schema), [...RESERVED_GRADE_SLUGS])
  })
})
