import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatExactTime, formatRelativeTime } from '../app/utils/relativeTime.ts'

const now = Date.parse('2026-10-19T15:00:00.000Z')
const minute = 60_000
const hour = 60 * minute
const day = 24 * hour

function ago(ms) {
  return new Date(now - ms).toISOString()
}

describe('formatRelativeTime', () => {
  it('says just now under a minute, including a slightly future clock', () => {
    assert.equal(formatRelativeTime(ago(0), now), 'μόλις τώρα')
    assert.equal(formatRelativeTime(ago(59_000), now), 'μόλις τώρα')
    assert.equal(formatRelativeTime(ago(-30_000), now), 'μόλις τώρα')
  })

  it('uses minutes and hours with Greek agreement', () => {
    assert.equal(formatRelativeTime(ago(minute), now), 'πριν από 1 λεπτό')
    assert.equal(formatRelativeTime(ago(2 * minute), now), 'πριν από 2 λεπτά')
    assert.equal(formatRelativeTime(ago(hour), now), 'πριν από 1 ώρα')
    assert.equal(formatRelativeTime(ago(3 * hour), now), 'πριν από 3 ώρες')
  })

  it('uses days under a week, then weeks under five', () => {
    assert.equal(formatRelativeTime(ago(4 * day), now), 'πριν από 4 ημέρες')
    assert.equal(formatRelativeTime(ago(6 * day), now), 'πριν από 6 ημέρες')
    assert.equal(formatRelativeTime(ago(7 * day), now), 'πριν από 1 εβδομάδα')
    assert.equal(formatRelativeTime(ago(14 * day), now), 'πριν από 2 εβδομάδες')
    assert.equal(formatRelativeTime(ago(28 * day), now), 'πριν από 4 εβδομάδες')
  })

  it('uses months and years with Greek agreement', () => {
    assert.equal(formatRelativeTime(ago(35 * day), now), 'πριν από 1 μήνα')
    assert.equal(formatRelativeTime(ago(90 * day), now), 'πριν από 3 μήνες')
    assert.equal(formatRelativeTime(ago(330 * day), now), 'πριν από 11 μήνες')
    assert.equal(formatRelativeTime(ago(360 * day), now), 'πριν από 12 μήνες')
    assert.equal(formatRelativeTime(ago(364 * day), now), 'πριν από 12 μήνες')
    assert.equal(formatRelativeTime(ago(365 * day), now), 'πριν από 1 έτος')
    assert.equal(formatRelativeTime(ago(2 * 365 * day), now), 'πριν από 2 έτη')
  })

  it('uses the future tense once the clock is more than a minute ahead', () => {
    assert.equal(formatRelativeTime(ago(-30_000), now), 'μόλις τώρα')
    assert.equal(formatRelativeTime(ago(-2 * minute), now), 'σε 2 λεπτά')
    assert.equal(formatRelativeTime(ago(-2 * hour), now), 'σε 2 ώρες')
  })

  it('returns an empty string for an invalid date', () => {
    assert.equal(formatRelativeTime('not-a-date', now), '')
  })
})

describe('formatExactTime', () => {
  it('formats Athens time with stable digits', () => {
    assert.equal(formatExactTime('2026-10-19T15:00:00.000Z'), '19/10/2026, 18:00')
    assert.equal(formatExactTime('not-a-date'), '')
  })
})
