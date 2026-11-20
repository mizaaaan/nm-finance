import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA } from '../netlify/functions/_shared/schema.js'

// db/schema.sql (human-readable) and _shared/schema.js (what /api/init runs)
// describe the same schema. This test fails if they drift apart.
const normalise = (sql) =>
  sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim())
    .filter(Boolean)

test('db/schema.sql matches the schema applied by /api/init', () => {
  const file = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
  assert.deepEqual(normalise(file), normalise(SCHEMA))
})
