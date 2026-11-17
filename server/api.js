import { Router } from 'express'
import { getPool } from './db.js'
import {
  clearSessionCookie,
  hashPassword,
  isAdmin,
  requireAdmin,
  requireUser,
  sessionUserId,
  setSessionCookie,
  verifyPassword
} from './auth.js'
import { applySchema } from './schema.js'

const TYPES = ['income', 'expense', 'contribution', 'dividend', 'liability', 'receivable']
const CATEGORIES = [
  'driver_rent',
  'other_income',
  'member_contribution',
  'car_maintenance',
  'insurance',
  'registration',
  'fuel',
  'office_expense',
  'transportation',
  'food_entertainment',
  'mobile_internet',
  'depreciation',
  'dividend_payout',
  'security_deposit_received',
  'security_deposit_refunded',
  'advance_rent_received',
  'advance_rent_recognized',
  'accident_fine_receivable_add',
  'accident_fine_receivable_paid'
]
// A category can only belong to one transaction type, so a 'fuel' row can never
// be saved as income.
const CATEGORY_TYPE = {
  driver_rent: 'income',
  other_income: 'income',
  member_contribution: 'contribution',
  car_maintenance: 'expense',
  insurance: 'expense',
  registration: 'expense',
  fuel: 'expense',
  office_expense: 'expense',
  transportation: 'expense',
  food_entertainment: 'expense',
  mobile_internet: 'expense',
  depreciation: 'expense',
  dividend_payout: 'dividend',
  security_deposit_received: 'liability',
  security_deposit_refunded: 'liability',
  advance_rent_received: 'liability',
  advance_rent_recognized: 'liability',
  accident_fine_receivable_add: 'receivable',
  accident_fine_receivable_paid: 'receivable'
}
const CAR_STATUSES = ['active', 'in_repair', 'sold']
const MEMBER_ROLES = ['member', 'admin']
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const num = (value) => Number(value) || 0
const today = () => new Date().toISOString().slice(0, 10)
const cleanName = (value) => (typeof value === 'string' ? value.trim() : '')
const orNull = (value) => (value === '' || value === undefined || value === null ? null : value)
const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}
const isPositiveAmount = (value) => Number.isFinite(Number(value)) && Number(value) > 0
const camelize = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      value
    ])
  )

// Turn MySQL errors into the responses the frontend already understands.
function fail(res, error) {
  if (error.code === 'ER_DUP_ENTRY') {
    const what = /email/.test(error.message || '') ? 'email address' : 'registration number'
    return res.status(409).json({ error: `That ${what} is already in use.` })
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'The selected member or car no longer exists.' })
  }
  if (['ER_TRUNCATED_WRONG_VALUE', 'ER_WRONG_VALUE', 'WARN_DATA_TRUNCATED'].includes(error.code)) {
    return res.status(400).json({ error: 'Invalid value in the request.' })
  }
  if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({ error: 'That value is not allowed here.' })
  }
  console.error('[api]', error)
  return res.status(500).json({ error: error.message || 'Something went wrong.' })
}

// Simple in-memory throttle for the login form: 10 attempts per IP per 15 min.
const attempts = new Map()
function tooManyAttempts(ip) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return false
  }
  entry.count += 1
  return entry.count > 10
}

export function createApiRouter() {
  const pool = getPool()
  const signedIn = requireUser(pool)
  const admin = requireAdmin(pool)
  const router = Router()

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  /* ── health + auth ──────────────────────────────────────── */

  router.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1')
      res.json({ ok: true, database: 'up' })
    } catch (error) {
      res.status(503).json({ ok: false, database: 'down', error: error.message })
    }
  })

  router.post('/auth/login', async (req, res) => {
    const ip = req.ip || 'unknown'
    if (tooManyAttempts(ip)) {
      return res.status(429).json({ error: 'Too many sign-in attempts. Try again in a few minutes.' })
    }
    const email = cleanName(req.body?.email).toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })

    try {
      const [rows] = await pool.query(
        'SELECT id, email, name, role, password_hash FROM users WHERE email = ?',
        [email]
      )
      const user = rows[0]
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'That email and password do not match.' })
      }
      setSessionCookie(req, res, user.id)
      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      })
    } catch (error) {
      fail(res, error)
    }
  })

  router.post('/auth/logout', (req, res) => {
    clearSessionCookie(req, res)
    res.json({ ok: true })
  })

  router.get('/auth/me', async (req, res) => {
    // Public on purpose: the login screen calls it to restore a session.
    const id = sessionUserId(req)
    if (!id) return res.json({ user: null })
    try {
      const [rows] = await pool.query('SELECT id, email, name, role FROM users WHERE id = ?', [id])
      res.json({ user: rows[0] || null })
    } catch (error) {
      fail(res, error)
    }
  })

  /* ── sign-in accounts (admin) ───────────────────────────── */

  router.get('/users', admin, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, email, name, role, created_at FROM users ORDER BY email'
      )
      res.json({ users: rows.map(camelize) })
    } catch (error) {
      fail(res, error)
    }
  })

  router.post('/users', admin, async (req, res) => {
    const email = cleanName(req.body?.email).toLowerCase()
    const password = String(req.body?.password || '')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
        [email, orNull(cleanName(req.body?.name)), hashPassword(password), 'member']
      )
      const [rows] = await pool.query(
        'SELECT id, email, name, role, created_at FROM users WHERE id = ?',
        [result.insertId]
      )
      res.status(201).json({ user: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  })

  router.delete('/users/:id', admin, async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove the account you are signed in with.' })
    }
    try {
      const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id])
      if (!result.affectedRows) return res.status(404).json({ error: 'Account not found' })
      res.json({ ok: true })
    } catch (error) {
      fail(res, error)
    }
  })

  /* ── members ────────────────────────────────────────────── */

  router.get('/members', signedIn, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, email, phone, role, joined_date, created_at FROM members ORDER BY name'
      )
      res.json({ members: rows.map(camelize) })
    } catch (error) {
      fail(res, error)
    }
  })

  router.post('/members', admin, async (req, res) => {
    const body = req.body || {}
    if (!cleanName(body.name)) return res.status(400).json({ error: 'Name is required' })
    if (body.role !== undefined && !MEMBER_ROLES.includes(body.role)) {
      return res.status(400).json({ error: 'Invalid member role' })
    }
    if (orNull(body.joined_date) && !isValidDate(body.joined_date)) {
      return res.status(400).json({ error: 'Invalid joined date' })
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO members (name, email, phone, role, joined_date) VALUES (?, ?, ?, ?, ?)',
        [
          cleanName(body.name),
          orNull(body.email),
          orNull(body.phone),
          body.role || 'member',
          orNull(body.joined_date) || today()
        ]
      )
      const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId])
      res.status(201).json({ member: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  })

  const updateMember = async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    const body = req.body || {}
    if (body.role !== undefined && !MEMBER_ROLES.includes(body.role)) {
      return res.status(400).json({ error: 'Invalid member role' })
    }
    if (body.name !== undefined && !cleanName(body.name)) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const sets = []
    const params = []
    if (body.name !== undefined) {
      sets.push('name = ?')
      params.push(cleanName(body.name))
    }
    if (body.email !== undefined) {
      sets.push('email = ?')
      params.push(orNull(body.email))
    }
    if (body.phone !== undefined) {
      sets.push('phone = ?')
      params.push(orNull(body.phone))
    }
    if (body.role !== undefined) {
      sets.push('role = ?')
      params.push(body.role)
    }
    try {
      if (sets.length) await pool.query(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`, [...params, id])
      const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id])
      if (!rows.length) return res.status(404).json({ error: 'Member not found' })
      res.json({ member: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  }
  router.patch('/members/:id', admin, updateMember)
  router.put('/members/:id', admin, updateMember)

  router.delete('/members/:id', admin, async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    try {
      const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id])
      if (!result.affectedRows) return res.status(404).json({ error: 'Member not found' })
      res.json({ ok: true })
    } catch (error) {
      fail(res, error)
    }
  })

  /* ── cars ───────────────────────────────────────────────── */

  router.get('/cars', signedIn, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, registration_no, purchase_price, purchase_date, status, created_at FROM cars ORDER BY name'
      )
      res.json({ cars: rows.map(camelize) })
    } catch (error) {
      fail(res, error)
    }
  })

  router.post('/cars', admin, async (req, res) => {
    const body = req.body || {}
    if (!cleanName(body.name)) return res.status(400).json({ error: 'Name is required' })
    if (body.status !== undefined && !CAR_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: 'Invalid car status' })
    }
    if (orNull(body.purchase_date) && !isValidDate(body.purchase_date)) {
      return res.status(400).json({ error: 'Invalid purchase date' })
    }
    if (num(body.purchase_price) < 0) {
      return res.status(400).json({ error: 'Purchase price cannot be negative' })
    }
    try {
      const [result] = await pool.query(
        'INSERT INTO cars (name, registration_no, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?)',
        [
          cleanName(body.name),
          orNull(body.registration_no),
          num(body.purchase_price),
          orNull(body.purchase_date),
          body.status || 'active'
        ]
      )
      const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [result.insertId])
      res.status(201).json({ car: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  })

  const updateCar = async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    const body = req.body || {}
    if (body.status !== undefined && !CAR_STATUSES.includes(body.status)) {
      return res.status(400).json({ error: 'Invalid car status' })
    }
    if (body.name !== undefined && !cleanName(body.name)) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (orNull(body.purchase_date) && !isValidDate(body.purchase_date)) {
      return res.status(400).json({ error: 'Invalid purchase date' })
    }
    if (body.purchase_price !== undefined && num(body.purchase_price) < 0) {
      return res.status(400).json({ error: 'Purchase price cannot be negative' })
    }
    const sets = []
    const params = []
    if (body.name !== undefined) {
      sets.push('name = ?')
      params.push(cleanName(body.name))
    }
    if (body.registration_no !== undefined) {
      sets.push('registration_no = ?')
      params.push(orNull(body.registration_no))
    }
    if (body.purchase_price !== undefined) {
      sets.push('purchase_price = ?')
      params.push(num(body.purchase_price))
    }
    if (body.purchase_date !== undefined) {
      sets.push('purchase_date = ?')
      params.push(orNull(body.purchase_date))
    }
    if (body.status !== undefined) {
      sets.push('status = ?')
      params.push(body.status)
    }
    try {
      if (sets.length) await pool.query(`UPDATE cars SET ${sets.join(', ')} WHERE id = ?`, [...params, id])
      const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [id])
      if (!rows.length) return res.status(404).json({ error: 'Car not found' })
      res.json({ car: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  }
  router.patch('/cars/:id', admin, updateCar)
  router.put('/cars/:id', admin, updateCar)

  router.delete('/cars/:id', admin, async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    try {
      const [result] = await pool.query('DELETE FROM cars WHERE id = ?', [id])
      if (!result.affectedRows) return res.status(404).json({ error: 'Car not found' })
      res.json({ ok: true })
    } catch (error) {
      fail(res, error)
    }
  })

  /* ── transactions ───────────────────────────────────────── */

  router.get('/transactions', signedIn, async (req, res) => {
    const { type, month, category } = req.query
    const parts = []
    const params = []
    if (type) {
      parts.push('t.type = ?')
      params.push(type)
    }
    if (month) {
      parts.push("DATE_FORMAT(t.txn_date, '%Y-%m') = ?")
      params.push(month)
    }
    if (category) {
      parts.push('t.category = ?')
      params.push(category)
    }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''
    // The Ledger pages through 200 rows at a time (clamped 1–500).
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    try {
      const [rows] = await pool.query(
        `SELECT
          t.id, t.type, t.category, t.amount, t.txn_date,
          t.description, t.car_id, t.member_id, t.created_by,
          m.name AS member_name, c.name AS car_name
        FROM transactions t
        LEFT JOIN members m ON m.id = t.member_id
        LEFT JOIN cars c ON c.id = t.car_id
        ${where}
        ORDER BY t.txn_date DESC, t.id DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
      res.json({ transactions: rows.map(camelize) })
    } catch (error) {
      fail(res, error)
    }
  })

  router.post('/transactions', admin, async (req, res) => {
    const body = req.body || {}
    if (!body.type || !TYPES.includes(body.type)) {
      return res.status(400).json({ error: 'Invalid transaction type' })
    }
    if (!body.category || !CATEGORIES.includes(body.category)) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    if (CATEGORY_TYPE[body.category] !== body.type) {
      return res.status(400).json({ error: 'Category does not match the transaction type' })
    }
    if (!isPositiveAmount(body.amount)) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }
    if (body.txn_date && !isValidDate(body.txn_date)) {
      return res.status(400).json({ error: 'Invalid date' })
    }
    try {
      const [result] = await pool.query(
        `INSERT INTO transactions
          (type, category, amount, txn_date, description, car_id, member_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.type,
          body.category,
          num(body.amount),
          body.txn_date || today(),
          orNull(body.description),
          orNull(body.car_id),
          orNull(body.member_id),
          req.user?.id || null
        ]
      )
      const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [result.insertId])
      res.status(201).json({ transaction: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  })

  const updateTransaction = async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    const body = req.body || {}
    if (body.type !== undefined && !TYPES.includes(body.type)) {
      return res.status(400).json({ error: 'Invalid transaction type' })
    }
    if (body.category !== undefined && !CATEGORIES.includes(body.category)) {
      return res.status(400).json({ error: 'Invalid category' })
    }
    if (body.amount !== undefined && !isPositiveAmount(body.amount)) {
      return res.status(400).json({ error: 'Amount must be greater than 0' })
    }
    if (body.txn_date !== undefined && !isValidDate(body.txn_date)) {
      return res.status(400).json({ error: 'Invalid date' })
    }
    try {
      const [existing] = await pool.query('SELECT type, category FROM transactions WHERE id = ?', [id])
      if (!existing.length) return res.status(404).json({ error: 'Transaction not found' })
      // Type and category must still agree after a partial update.
      if (body.type !== undefined || body.category !== undefined) {
        const nextType = body.type ?? existing[0].type
        const nextCategory = body.category ?? existing[0].category
        if (CATEGORY_TYPE[nextCategory] !== nextType) {
          return res.status(400).json({ error: 'Category does not match the transaction type' })
        }
      }
      const sets = []
      const params = []
      if (body.type !== undefined) {
        sets.push('type = ?')
        params.push(body.type)
      }
      if (body.category !== undefined) {
        sets.push('category = ?')
        params.push(body.category)
      }
      if (body.amount !== undefined) {
        sets.push('amount = ?')
        params.push(num(body.amount))
      }
      if (body.txn_date !== undefined) {
        sets.push('txn_date = ?')
        params.push(body.txn_date)
      }
      if (body.description !== undefined) {
        sets.push('description = ?')
        params.push(orNull(body.description))
      }
      if (body.car_id !== undefined) {
        sets.push('car_id = ?')
        params.push(orNull(body.car_id))
      }
      if (body.member_id !== undefined) {
        sets.push('member_id = ?')
        params.push(orNull(body.member_id))
      }
      if (sets.length) {
        await pool.query(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, [...params, id])
      }
      const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id])
      res.json({ transaction: camelize(rows[0]) })
    } catch (error) {
      fail(res, error)
    }
  }
  router.patch('/transactions/:id', admin, updateTransaction)
  router.put('/transactions/:id', admin, updateTransaction)

  router.delete('/transactions/:id', admin, async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid id' })
    try {
      const [result] = await pool.query('DELETE FROM transactions WHERE id = ?', [id])
      if (!result.affectedRows) return res.status(404).json({ error: 'Transaction not found' })
      res.json({ ok: true })
    } catch (error) {
      fail(res, error)
    }
  })

  /* ── dashboard ──────────────────────────────────────────── */

  router.get('/dashboard', signedIn, async (req, res) => {
    const now = new Date()
    const fallbackMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const month = MONTH_RE.test(String(req.query.month || '')) ? req.query.month : fallbackMonth

    try {
      // All-time cash balance. Liability/receivable rows move real cash but are
      // not income or expense — the categories below decide each side.
      const [[totals]] = await pool.query(`
        SELECT
          COALESCE(SUM(CASE
            WHEN type IN ('income', 'contribution') THEN amount
            WHEN type = 'liability' AND category IN ('security_deposit_received', 'advance_rent_received') THEN amount
            WHEN type = 'receivable' AND category = 'accident_fine_receivable_paid' THEN amount
            ELSE 0 END), 0) AS inflow,
          COALESCE(SUM(CASE
            WHEN type IN ('expense', 'dividend') THEN amount
            WHEN type = 'liability' AND category = 'security_deposit_refunded' THEN amount
            ELSE 0 END), 0) AS outflow
        FROM transactions
      `)

      const [[balances]] = await pool.query(`
        SELECT
          COALESCE(SUM(CASE
            WHEN type = 'liability' AND category IN ('security_deposit_received', 'advance_rent_received') THEN amount
            WHEN type = 'liability' AND category IN ('security_deposit_refunded', 'advance_rent_recognized') THEN -amount
            ELSE 0 END), 0) AS liability_balance,
          COALESCE(SUM(CASE
            WHEN type = 'receivable' AND category = 'accident_fine_receivable_add' THEN amount
            WHEN type = 'receivable' AND category = 'accident_fine_receivable_paid' THEN -amount
            ELSE 0 END), 0) AS receivable_balance
        FROM transactions
      `)

      const [[monthly]] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN type = 'income'       THEN amount ELSE 0 END), 0) AS income,
          COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) AS contributions,
          COALESCE(SUM(CASE WHEN type = 'expense'      THEN amount ELSE 0 END), 0) AS expenses,
          COALESCE(SUM(CASE WHEN type = 'dividend'     THEN amount ELSE 0 END), 0) AS dividends
        FROM transactions
        WHERE DATE_FORMAT(txn_date, '%Y-%m') = ?`,
        [month]
      )

      // Trailing 6 months ending at the selected month. MySQL has no
      // generate_series, so the calendar months are built here and the query
      // results are zero-filled against them — the chart axis stays complete.
      const [year, monthNumber] = month.split('-').map(Number)
      const calendar = []
      for (let back = 5; back >= 0; back -= 1) {
        const d = new Date(Date.UTC(year, monthNumber - 1 - back, 1))
        calendar.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
      }
      // Exclusive upper bound: the first day of the month AFTER the selected one,
      // so the selected month is included whole.
      const after = new Date(Date.UTC(year, monthNumber, 1))
      const end = `${after.getUTCFullYear()}-${String(after.getUTCMonth() + 1).padStart(2, '0')}-01`
      const [trendRows] = await pool.query(
        `SELECT DATE_FORMAT(txn_date, '%Y-%m') AS month,
          COALESCE(SUM(CASE WHEN type IN ('income', 'contribution') THEN amount ELSE 0 END), 0) AS inflow,
          COALESCE(SUM(CASE WHEN type IN ('expense', 'dividend') THEN amount ELSE 0 END), 0) AS outflow
        FROM transactions
        WHERE txn_date >= ? AND txn_date < ?
        GROUP BY month`,
        [`${calendar[0]}-01`, end]
      )
      const trendByMonth = new Map(trendRows.map((row) => [row.month, row]))
      const trend = calendar.map((key) => ({
        month: key,
        inflow: num(trendByMonth.get(key)?.inflow),
        outflow: num(trendByMonth.get(key)?.outflow)
      }))

      const [memberRows] = await pool.query(
        `SELECT m.id, m.name, m.role,
          COALESCE(SUM(CASE WHEN t.type = 'contribution' THEN t.amount ELSE 0 END), 0) AS contributions,
          COALESCE(SUM(CASE WHEN t.type = 'dividend'     THEN t.amount ELSE 0 END), 0) AS dividends
        FROM members m
        LEFT JOIN transactions t ON t.member_id = m.id
        GROUP BY m.id, m.name, m.role
        ORDER BY m.name`
      )

      const [recent] = await pool.query(
        `SELECT id, txn_date AS \`date\`, type, category, description, amount
        FROM transactions
        ORDER BY txn_date DESC, id DESC
        LIMIT 8`
      )

      const [carRows] = await pool.query(
        'SELECT status, COUNT(*) AS count FROM cars GROUP BY status'
      )

      const inflow = num(totals.inflow)
      const outflow = num(totals.outflow)
      const income = num(monthly.income)
      const contributions = num(monthly.contributions)
      const expenses = num(monthly.expenses)
      const dividends = num(monthly.dividends)

      res.json({
        asOf: now.toISOString(),
        balance: { inflow, outflow, net: inflow - outflow },
        liabilityBalance: num(balances.liability_balance),
        receivableBalance: num(balances.receivable_balance),
        month,
        monthly: {
          income,
          contributions,
          expenses,
          dividends,
          net: income + contributions - expenses - dividends
        },
        trend,
        members: memberRows.map((row) => {
          const contributed = num(row.contributions)
          const received = num(row.dividends)
          return {
            id: row.id,
            name: row.name,
            role: row.role,
            contributions: contributed,
            dividends: received,
            net: contributed - received
          }
        }),
        recent: recent.map((row) => ({
          id: row.id,
          date: row.date,
          type: row.type,
          category: row.category,
          description: row.description,
          amount: num(row.amount)
        })),
        cars: carRows.map((row) => ({ status: row.status, count: Number(row.count) }))
      })
    } catch (error) {
      fail(res, error)
    }
  })

  /* ── setup + reset (admin) ──────────────────────────────── */

  router.post('/init', admin, async (_req, res) => {
    try {
      const applied = await applySchema(pool)
      res.json({ ok: true, applied })
    } catch (error) {
      fail(res, error)
    }
  })

  router.post('/reset', admin, async (_req, res) => {
    const connection = await pool.getConnection()
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0')
      await connection.query('TRUNCATE TABLE transactions')
      await connection.query('TRUNCATE TABLE cars')
      await connection.query('TRUNCATE TABLE members')
      await connection.query('SET FOREIGN_KEY_CHECKS = 1')
      res.json({ ok: true })
    } catch (error) {
      fail(res, error)
    } finally {
      connection.release()
    }
  })

  router.use((_req, res) => res.status(404).json({ error: 'Unknown API route' }))

  return router
}

export { isAdmin }
