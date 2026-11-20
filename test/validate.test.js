import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIES,
  CATEGORY_TYPE,
  TYPES,
  isValidAmount,
  isValidDate,
  isValidEmail,
  isValidNonNegativeAmount,
  orNull,
  parseOptionalId
} from '../netlify/functions/_shared/validate.js'

describe('isValidDate', () => {
  test('accepts real calendar dates', () => {
    for (const d of ['2026-02-28', '2028-02-29', '2026-12-31']) assert.equal(isValidDate(d), true, d)
  })
  test('rejects impossible or malformed dates', () => {
    for (const d of ['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-1', '', 'today', null, undefined, 20260101]) {
      assert.equal(isValidDate(d), false, String(d))
    }
  })
})

describe('isValidAmount', () => {
  test('accepts positive amounts with up to 2 decimals', () => {
    for (const v of [1, 0.01, 12.5, '12.50', 9999999999.99, 1234.56]) assert.equal(isValidAmount(v), true, String(v))
  })
  test('rejects zero, negatives, NaN, blanks and over-precise or oversized values', () => {
    for (const v of [0, -1, '', '  ', 'abc', NaN, Infinity, null, undefined, 0.001, 10.005, 1e10, 10000000000]) {
      assert.equal(isValidAmount(v), false, String(v))
    }
  })
  test('non-negative variant also allows 0', () => {
    assert.equal(isValidNonNegativeAmount(0), true)
    assert.equal(isValidNonNegativeAmount('0'), true)
    assert.equal(isValidNonNegativeAmount(-5), false)
    assert.equal(isValidNonNegativeAmount(5.555), false)
  })
})

describe('isValidEmail', () => {
  test('basic shape check', () => {
    assert.equal(isValidEmail('a@b.co'), true)
    for (const v of ['a', 'a@b', '@b.co', 'a b@c.de', '', null, 5]) assert.equal(isValidEmail(v), false, String(v))
  })
})

describe('parseOptionalId / orNull', () => {
  test('parseOptionalId', () => {
    assert.equal(parseOptionalId(null), null)
    assert.equal(parseOptionalId(''), null)
    assert.equal(parseOptionalId(undefined), null)
    assert.equal(parseOptionalId(7), 7)
    assert.equal(parseOptionalId('7'), 7)
    for (const v of [0, -1, 1.5, 'abc', '1; DROP TABLE x', {}, [], true]) assert.equal(parseOptionalId(v), undefined, String(v))
  })
  test('orNull trims and nulls blanks', () => {
    assert.equal(orNull('  hi '), 'hi')
    assert.equal(orNull('   '), null)
    assert.equal(orNull(undefined), null)
    assert.equal(orNull(0), 0)
  })
})

describe('category map', () => {
  test('every category maps to a known type, and every type has a category', () => {
    for (const c of CATEGORIES) assert.ok(TYPES.includes(CATEGORY_TYPE[c]), c)
    for (const t of TYPES) assert.ok(CATEGORIES.some((c) => CATEGORY_TYPE[c] === t), t)
  })
})
