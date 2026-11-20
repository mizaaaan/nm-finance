import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import postgres from 'postgres'
import data from '../netlify/functions/data.js'
import dashboard from '../netlify/functions/dashboard.js'
import init from '../netlify/functions/init.js'
import reset from '../netlify/functions/reset.js'
import me from '../netlify/functions/me.js'
import { JWT_SECRET, call, setEnv, tokens } from './helpers.js'

// Integration tests: the real handlers against a real Postgres.
//
//   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/nm_test npm test
//
// Use a THROWAWAY database — the tests wipe all tables. Without
// TEST_DATABASE_URL this whole file is skipped (the unit tests still run).
const URL_ = process.env.TEST_DATABASE_URL
const skip = URL_ ? false : 'set TEST_DATABASE_URL to run the database tests'

describe('API (real Postgres)', { skip }, () => {
  let sql
  let restore

  before(async () => {
    restore = setEnv({
      JWT_SECRET,
      DATABASE_URL: URL_,
      NETLIFY_DB_URL: undefined,
      DATABASE_SSL: process.env.TEST_DATABASE_SSL || 'false',
      ADMIN_EMAILS: 'admin@example.com',
      MEMBER_EMAILS: 'member@example.com',
      ALLOW_ANY_SIGNED_IN_USER: undefined,
      ENABLE_DATA_RESET: undefined
    })
    sql = postgres(URL_, { ssl: false, max: 1 })
    await sql`DROP TABLE IF EXISTS transactions, cars, members CASCADE`
    const res = await call(init, 'POST', '/api/init', { token: tokens.admin() })
    assert.equal(res.status, 200, res.text)
  })

  after(async () => {
    await sql?.end()
    restore?.()
  })

  beforeEach(async () => {
    await sql`TRUNCATE transactions, cars, members RESTART IDENTITY CASCADE`
    process.env.ENABLE_DATA_RESET = ''
  })

  const admin = () => tokens.admin()
  const get = (path, token = admin()) => call(data, 'GET', path, { token })
  const post = (path, body, token = admin()) => call(data, 'POST', path, { token, body })
  const patch = (path, body, token = admin()) => call(data, 'PATCH', path, { token, body })
  const del = (path, token = admin()) => call(data, 'DELETE', path, { token })

  async function makeMember(name = 'Ada Member', extra = {}) {
    const res = await post('/api/members', { name, ...extra })
    assert.equal(res.status, 201, res.text)
    return res.data.member
  }

  /* ── access control ─────────────────────────────────────────────── */

  describe('access control', () => {
    test('no token → 401 on every endpoint', async () => {
      for (const [h, m, p] of [
        [data, 'GET', '/api/members'],
        [data, 'GET', '/api/cars'],
        [data, 'GET', '/api/transactions'],
        [dashboard, 'GET', '/api/dashboard'],
        [data, 'POST', '/api/members'],
        [init, 'POST', '/api/init'],
        [reset, 'POST', '/api/reset'],
        [me, 'GET', '/api/me']
      ]) {
        const res = await call(h, m, p, { body: m === 'POST' ? {} : undefined })
        assert.equal(res.status, 401, `${m} ${p}`)
      }
    })

    test('a signed-in stranger cannot read ANY data (the open-sign-up hole)', async () => {
      const token = tokens.stranger()
      for (const p of ['/api/members', '/api/cars', '/api/transactions']) {
        const res = await get(p, token)
        assert.equal(res.status, 403, p)
        assert.equal(res.data.code, 'ACCESS_PENDING')
      }
      assert.equal((await call(dashboard, 'GET', '/api/dashboard', { token })).status, 403)
    })

    test('members can read but every write is refused', async () => {
      const token = tokens.member()
      assert.equal((await get('/api/members', token)).status, 200)
      assert.equal((await get('/api/transactions', token)).status, 200)
      assert.equal((await call(dashboard, 'GET', '/api/dashboard', { token })).status, 200)
      assert.equal((await post('/api/members', { name: 'X' }, token)).status, 403)
      assert.equal((await patch('/api/members/1', { name: 'X' }, token)).status, 403)
      assert.equal((await del('/api/members/1', token)).status, 403)
      assert.equal((await call(init, 'POST', '/api/init', { token })).status, 403)
      assert.equal((await call(reset, 'POST', '/api/reset', { token, body: { confirm: 'RESET' } })).status, 403)
    })

    test('Identity roles work without any env var', async () => {
      assert.equal((await post('/api/members', { name: 'Via role' }, tokens.roleAdmin())).status, 201)
      assert.equal((await get('/api/members', tokens.roleMember())).status, 200)
      assert.equal((await post('/api/members', { name: 'Nope' }, tokens.roleMember())).status, 403)
    })

    test('/api/me reports the access level', async () => {
      const ask = async (token) => (await call(me, 'GET', '/api/me', { token })).data
      assert.equal((await ask(tokens.admin())).access, 'admin')
      assert.equal((await ask(tokens.member())).access, 'member')
      const stranger = await ask(tokens.stranger())
      assert.equal(stranger.access, 'none')
      assert.deepEqual(stranger.features, { reset: false })
    })
  })

  /* ── members ────────────────────────────────────────────────────── */

  describe('members', () => {
    test('create, list, update, delete', async () => {
      const m = await makeMember('  Ada Lovelace ', { email: 'ADA@Example.com', phone: ' 123 ' })
      assert.equal(m.name, 'Ada Lovelace')
      assert.equal(m.email, 'ada@example.com', 'email is stored lower-case')
      assert.equal(m.phone, '123')
      assert.equal(m.role, 'member')

      assert.equal((await get('/api/members')).data.members.length, 1)

      const up = await patch(`/api/members/${m.id}`, { name: 'Ada L.', phone: '' })
      assert.equal(up.status, 200)
      assert.equal(up.data.member.name, 'Ada L.')
      assert.equal(up.data.member.phone, null)
      assert.equal(up.data.member.email, 'ada@example.com', 'untouched fields are preserved')

      assert.equal((await del(`/api/members/${m.id}`)).status, 200)
      assert.equal((await del(`/api/members/${m.id}`)).status, 404)
    })

    test('validation', async () => {
      for (const body of [
        {},
        { name: '   ' },
        { name: 'x'.repeat(121) },
        { name: 'A', email: 'not-an-email' },
        { name: 'A', role: 'superuser' },
        { name: 'A', joined_date: '2026-02-30' },
        { name: 'A', phone: 'p'.repeat(41) }
      ]) {
        const res = await post('/api/members', body)
        assert.equal(res.status, 400, JSON.stringify(body))
        assert.ok(res.data.error)
      }
    })

    test('duplicate email (any letter case) → 409', async () => {
      await makeMember('One', { email: 'dup@example.com' })
      const res = await post('/api/members', { name: 'Two', email: 'DUP@example.com' })
      assert.equal(res.status, 409)
      assert.match(res.data.error, /email/)
    })

    test('a member with contributions or dividends cannot be deleted', async () => {
      const m = await makeMember()
      await post('/api/transactions', { type: 'contribution', category: 'member_contribution', amount: 500, member_id: m.id })
      const res = await del(`/api/members/${m.id}`)
      assert.equal(res.status, 409)
      assert.match(res.data.error, /investment history/)
      assert.equal((await get('/api/members')).data.members.length, 1, 'still there')

      // once the entry is gone the member can be deleted
      const tx = (await get('/api/transactions')).data.transactions[0]
      await del(`/api/transactions/${tx.id}`)
      assert.equal((await del(`/api/members/${m.id}`)).status, 200)
    })

    test('a member with no investment records can be deleted', async () => {
      const m = await makeMember()
      assert.equal((await del(`/api/members/${m.id}`)).status, 200)
    })

    test('bad ids and bodies', async () => {
      assert.equal((await del('/api/members/abc')).status, 400)
      assert.equal((await del('/api/members/0')).status, 400)
      assert.equal((await del('/api/members/-3')).status, 400)
      assert.equal((await patch('/api/members/99999', { name: 'x' })).status, 404)
      assert.equal((await call(data, 'POST', '/api/members', { token: admin(), rawBody: '{not json' })).status, 400)
      assert.equal((await call(data, 'POST', '/api/members', { token: admin(), rawBody: '[1,2]' })).status, 400)
      assert.equal((await call(data, 'POST', '/api/members', { token: admin(), rawBody: '' })).status, 400)
      assert.equal((await call(data, 'POST', '/api/members', { token: admin(), rawBody: JSON.stringify({ name: 'x'.repeat(200000) }) })).status, 413)
    })
  })

  /* ── cars ───────────────────────────────────────────────────────── */

  describe('cars', () => {
    test('create, update status, duplicate registration, delete', async () => {
      const created = await post('/api/cars', { name: 'Camry', registration_no: ' 12345 ', purchase_price: 39400.5, purchase_date: '2026-04-23' })
      assert.equal(created.status, 201, created.text)
      const car = created.data.car
      assert.equal(car.registrationNo, '12345')
      assert.equal(Number(car.purchasePrice), 39400.5)

      assert.equal((await post('/api/cars', { name: 'Other', registration_no: '12345' })).status, 409)

      const up = await patch(`/api/cars/${car.id}`, { status: 'sold' })
      assert.equal(up.data.car.status, 'sold')
      assert.equal(up.data.car.name, 'Camry')

      assert.equal((await del(`/api/cars/${car.id}`)).status, 200)
    })

    test('validation', async () => {
      for (const body of [
        {},
        { name: 'A', status: 'flying' },
        { name: 'A', purchase_price: -1 },
        { name: 'A', purchase_price: 1.234 },
        { name: 'A', purchase_date: '2026-13-01' }
      ]) {
        assert.equal((await post('/api/cars', body)).status, 400, JSON.stringify(body))
      }
    })
  })

  /* ── transactions ───────────────────────────────────────────────── */

  describe('transactions', () => {
    const income = (extra = {}) => ({ type: 'income', category: 'driver_rent', amount: 100, txn_date: '2026-07-10', ...extra })

    test('create and list with member/car names', async () => {
      const m = await makeMember('Ada')
      const car = (await post('/api/cars', { name: 'Camry' })).data.car
      const a = await post('/api/transactions', { type: 'contribution', category: 'member_contribution', amount: 250.75, txn_date: '2026-07-01', member_id: m.id })
      assert.equal(a.status, 201, a.text)
      await post('/api/transactions', income({ car_id: car.id, description: '  rent  ' }))

      const list = (await get('/api/transactions')).data.transactions
      assert.equal(list.length, 2)
      const contribution = list.find((t) => t.type === 'contribution')
      assert.equal(contribution.memberName, 'Ada')
      assert.equal(Number(contribution.amount), 250.75)
      assert.equal(contribution.txnDate, '2026-07-01')
      const rent = list.find((t) => t.type === 'income')
      assert.equal(rent.carName, 'Camry')
      assert.equal(rent.description, 'rent')
    })

    test('validation: type/category/amount/date/member', async () => {
      const m = await makeMember()
      const cases = [
        [{}, 'empty'],
        [income({ type: 'bogus' }), 'bad type'],
        [income({ category: 'bogus' }), 'bad category'],
        [income({ category: 'fuel' }), 'category from another type'],
        [income({ amount: 0 }), 'zero'],
        [income({ amount: -5 }), 'negative'],
        [income({ amount: 12.345 }), '3 decimals'],
        [income({ amount: 'lots' }), 'not a number'],
        [income({ amount: 1e12 }), 'too large'],
        [income({ txn_date: '2026-02-30' }), 'impossible date'],
        [income({ txn_date: 'yesterday' }), 'text date'],
        [income({ car_id: 'abc' }), 'bad car id'],
        [income({ car_id: -1 }), 'negative car id'],
        [income({ description: 'x'.repeat(501) }), 'long description'],
        [{ type: 'contribution', category: 'member_contribution', amount: 10 }, 'contribution without member'],
        [{ type: 'dividend', category: 'dividend_payout', amount: 10, member_id: '' }, 'dividend without member'],
        [{ type: 'dividend', category: 'dividend_payout', amount: 10, member_id: 'x' }, 'bad member id']
      ]
      for (const [body, label] of cases) {
        const res = await post('/api/transactions', body)
        assert.equal(res.status, 400, `${label}: ${res.text}`)
      }
      assert.equal((await post('/api/transactions', { type: 'dividend', category: 'dividend_payout', amount: 10, member_id: m.id })).status, 201)
    })

    test('referencing a member or car that does not exist → 400, not 500', async () => {
      assert.equal((await post('/api/transactions', income({ car_id: 9999 }))).status, 400)
      assert.equal((await post('/api/transactions', { type: 'dividend', category: 'dividend_payout', amount: 5, member_id: 9999 })).status, 400)
    })

    test('created_by from the request is ignored', async () => {
      const m = await makeMember()
      const res = await post('/api/transactions', income({ created_by: m.id }))
      assert.equal(res.status, 201)
      assert.equal(res.data.transaction.createdBy, null)
    })

    test('partial updates keep type, category and member consistent', async () => {
      const m = await makeMember()
      const tx = (await post('/api/transactions', income())).data.transaction

      // change only the amount: fine
      const a = await patch(`/api/transactions/${tx.id}`, { amount: 99.5 })
      assert.equal(a.status, 200)
      assert.equal(Number(a.data.transaction.amount), 99.5)
      assert.equal(a.data.transaction.category, 'driver_rent', 'other fields untouched')

      // change type without a matching category: refused
      assert.equal((await patch(`/api/transactions/${tx.id}`, { type: 'expense' })).status, 400)
      // change both together: fine
      assert.equal((await patch(`/api/transactions/${tx.id}`, { type: 'expense', category: 'fuel' })).status, 200)
      // turning it into a contribution requires a member
      assert.equal((await patch(`/api/transactions/${tx.id}`, { type: 'contribution', category: 'member_contribution' })).status, 400)
      assert.equal((await patch(`/api/transactions/${tx.id}`, { type: 'contribution', category: 'member_contribution', member_id: m.id })).status, 200)
      // and the member can't be removed afterwards
      assert.equal((await patch(`/api/transactions/${tx.id}`, { member_id: null })).status, 400)

      assert.equal((await patch(`/api/transactions/${tx.id}`, { txn_date: 'nope' })).status, 400)
      assert.equal((await patch('/api/transactions/99999', { amount: 5 })).status, 404)
      assert.equal((await patch('/api/transactions/99999', { type: 'expense', category: 'fuel' })).status, 404)
    })

    test('filters and pagination', async () => {
      for (let i = 1; i <= 5; i++) await post('/api/transactions', income({ txn_date: `2026-07-0${i}`, amount: i }))
      await post('/api/transactions', { type: 'expense', category: 'fuel', amount: 7, txn_date: '2026-08-01' })

      assert.equal((await get('/api/transactions?month=2026-07')).data.transactions.length, 5)
      assert.equal((await get('/api/transactions?month=2026-08')).data.transactions.length, 1)
      assert.equal((await get('/api/transactions?type=expense')).data.transactions.length, 1)
      assert.equal((await get('/api/transactions?category=fuel')).data.transactions.length, 1)
      assert.equal((await get('/api/transactions?type=income&month=2026-08')).data.transactions.length, 0)

      const page1 = (await get('/api/transactions?limit=4&offset=0')).data.transactions
      const page2 = (await get('/api/transactions?limit=4&offset=4')).data.transactions
      assert.equal(page1.length, 4)
      assert.equal(page2.length, 2)
      assert.equal(new Set([...page1, ...page2].map((t) => t.id)).size, 6, 'no overlap, no gaps')
      assert.equal(page1[0].txnDate, '2026-08-01', 'newest first')

      assert.equal((await get('/api/transactions?type=bogus')).status, 400)
      assert.equal((await get('/api/transactions?category=bogus')).status, 400)
      assert.equal((await get('/api/transactions?month=July')).status, 400)
    })

    test('SQL-injection attempts in filters are rejected or inert', async () => {
      const evil = encodeURIComponent("income' OR '1'='1")
      assert.equal((await get(`/api/transactions?type=${evil}`)).status, 400)
      assert.equal((await get(`/api/transactions?month=${evil}`)).status, 400)
      assert.equal((await get('/api/transactions?limit=1;DROP TABLE transactions')).status, 200)
      assert.equal((await get('/api/transactions')).status, 200, 'table still exists')
    })

    test('delete', async () => {
      const tx = (await post('/api/transactions', income())).data.transaction
      assert.equal((await del(`/api/transactions/${tx.id}`)).status, 200)
      assert.equal((await del(`/api/transactions/${tx.id}`)).status, 404)
    })
  })

  /* ── dashboard ──────────────────────────────────────────────────── */

  describe('dashboard', () => {
    test('totals, liabilities, receivables, members, trend', async () => {
      const m = await makeMember('Ada')
      await post('/api/cars', { name: 'A', status: 'active' })
      await post('/api/cars', { name: 'B', status: 'sold' })
      const tx = (body) => post('/api/transactions', body)
      await tx({ type: 'contribution', category: 'member_contribution', amount: 1000, txn_date: '2026-06-01', member_id: m.id })
      await tx({ type: 'income', category: 'driver_rent', amount: 300, txn_date: '2026-07-05' })
      await tx({ type: 'expense', category: 'fuel', amount: 50, txn_date: '2026-07-06' })
      await tx({ type: 'dividend', category: 'dividend_payout', amount: 40, txn_date: '2026-07-07', member_id: m.id })
      await tx({ type: 'liability', category: 'security_deposit_received', amount: 200, txn_date: '2026-07-08' })
      await tx({ type: 'liability', category: 'security_deposit_refunded', amount: 50, txn_date: '2026-07-09' })
      await tx({ type: 'receivable', category: 'accident_fine_receivable_add', amount: 120, txn_date: '2026-07-10' })
      await tx({ type: 'receivable', category: 'accident_fine_receivable_paid', amount: 20, txn_date: '2026-07-11' })

      const res = await call(dashboard, 'GET', '/api/dashboard?month=2026-07', { token: admin() })
      assert.equal(res.status, 200, res.text)
      const d = res.data
      // inflow = income 300 + contribution 1000 + deposit 200 + receivable paid 20
      // outflow = expense 50 + dividend 40 + deposit refunded 50
      assert.deepEqual(d.balance, { inflow: 1520, outflow: 140, net: 1380 })
      assert.equal(d.liabilityBalance, 150)
      assert.equal(d.receivableBalance, 100)
      assert.deepEqual(d.monthly, { income: 300, contributions: 0, expenses: 50, dividends: 40, net: 210 })
      assert.equal(d.trend.length, 6, 'zero-filled six months')
      assert.equal(d.trend.at(-1).month, '2026-07')
      assert.equal(d.trend.at(-2).month, '2026-06')
      assert.equal(d.trend.at(-2).inflow, 1000)
      assert.deepEqual(d.members[0], { id: m.id, name: 'Ada', role: 'member', contributions: 1000, dividends: 40, net: 960 })
      assert.equal(d.recent.length, 8)
      assert.deepEqual(Object.fromEntries(d.cars.map((c) => [c.status, c.count])), { active: 1, sold: 1 })
    })

    test('a bad month falls back to the current month instead of erroring', async () => {
      const res = await call(dashboard, 'GET', '/api/dashboard?month=garbage', { token: admin() })
      assert.equal(res.status, 200)
      assert.match(res.data.month, /^\d{4}-\d{2}$/)
    })

    test('works on an empty database', async () => {
      const res = await call(dashboard, 'GET', '/api/dashboard?month=2026-01', { token: admin() })
      assert.equal(res.status, 200)
      assert.deepEqual(res.data.balance, { inflow: 0, outflow: 0, net: 0 })
    })
  })

  /* ── setup & reset ──────────────────────────────────────────────── */

  describe('init and reset', () => {
    test('init is idempotent and never removes data', async () => {
      await makeMember('Keep me')
      assert.equal((await call(init, 'POST', '/api/init', { token: admin() })).status, 200)
      assert.equal((await get('/api/members')).data.members.length, 1)
      assert.equal((await call(init, 'GET', '/api/init', { token: admin() })).status, 405)
    })

    test('reset is disabled unless the owner enables it', async () => {
      await makeMember('Keep me')
      const res = await call(reset, 'POST', '/api/reset', { token: admin(), body: { confirm: 'RESET' } })
      assert.equal(res.status, 403)
      assert.match(res.data.error, /switched off/)
      assert.equal((await get('/api/members')).data.members.length, 1)
    })

    test('reset needs the confirmation phrase, then wipes everything and restarts ids', async () => {
      process.env.ENABLE_DATA_RESET = 'true'
      await makeMember('Gone soon')
      await post('/api/cars', { name: 'Gone too' })

      for (const body of [{}, { confirm: 'reset' }, { confirm: true }]) {
        assert.equal((await call(reset, 'POST', '/api/reset', { token: admin(), body })).status, 400, JSON.stringify(body))
      }
      assert.equal((await call(reset, 'POST', '/api/reset', { token: admin() })).status, 400, 'no body')
      assert.equal((await get('/api/members')).data.members.length, 1, 'nothing wiped yet')

      assert.equal((await call(reset, 'POST', '/api/reset', { token: admin(), body: { confirm: 'RESET' } })).status, 200)
      assert.equal((await get('/api/members')).data.members.length, 0)
      assert.equal((await get('/api/cars')).data.cars.length, 0)
      assert.equal((await makeMember('Fresh')).id, 1, 'id counter restarted')
    })

    test('/api/me advertises the reset switch', async () => {
      process.env.ENABLE_DATA_RESET = 'true'
      assert.equal((await call(me, 'GET', '/api/me', { token: admin() })).data.features.reset, true)
    })
  })

  /* ── failure handling ───────────────────────────────────────────── */

  describe('failures never leak internals', () => {
    test('unreachable database → generic 500 with a reference, no host or driver text', async () => {
      const restoreDb = setEnv({ DATABASE_URL: 'postgres://nm:secret@127.0.0.1:1/nope' })
      const errors = []
      const original = console.error
      console.error = (...args) => errors.push(args.join(' '))
      try {
        for (const res of [await get('/api/members'), await call(dashboard, 'GET', '/api/dashboard', { token: admin() })]) {
          assert.equal(res.status, 500)
          assert.match(res.data.error, /reference [0-9a-f]{8}/)
          assert.doesNotMatch(res.text, /ECONNREFUSED|127\.0\.0\.1|secret|postgres/i)
        }
        assert.ok(errors.length >= 2, 'the real error is logged server-side')
      } finally {
        console.error = original
        restoreDb()
      }
    })

    test('missing database configuration → 503 with a friendly message', async () => {
      const restoreDb = setEnv({ DATABASE_URL: undefined, NETLIFY_DB_URL: undefined })
      const original = console.error
      console.error = () => {}
      try {
        const res = await get('/api/members')
        assert.equal(res.status, 503)
        assert.doesNotMatch(res.text, /NETLIFY_DB_URL/)
      } finally {
        console.error = original
        restoreDb()
      }
    })

    test('tables not created yet → 503 telling an admin to run setup', async () => {
      await sql`DROP TABLE transactions, cars, members CASCADE`
      try {
        const res = await call(dashboard, 'GET', '/api/dashboard', { token: admin() })
        assert.equal(res.status, 503)
        assert.match(res.data.error, /not been set up/)
      } finally {
        assert.equal((await call(init, 'POST', '/api/init', { token: admin() })).status, 200)
      }
    })

    test('unknown resource and unsupported methods', async () => {
      assert.equal((await get('/api/nothing')).status, 404)
      assert.equal((await call(data, 'PUT', '/api/members', { token: admin(), body: { name: 'x' } })).status, 405)
      assert.equal((await call(dashboard, 'POST', '/api/dashboard', { token: admin() })).status, 405)
    })
  })
})
