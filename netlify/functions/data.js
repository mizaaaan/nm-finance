import postgres from 'postgres'
import { requireUser, requireAdmin } from './_shared/auth.js'

const CONNECTION_STRING = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL

const TYPES = ['income', 'expense', 'contribution', 'dividend', 'liability', 'receivable']
const CATEGORIES = [
  // income
  'driver_rent',
  'other_income',
  // contribution
  'member_contribution',
  // expense
  'car_maintenance',
  'insurance',
  'registration',
  'fuel',
  'office_expense',
  'transportation',
  'food_entertainment',
  'mobile_internet',
  'depreciation',
  // dividend
  'dividend_payout',
  // liability — cash held that isn't company income yet
  'security_deposit_received',
  'security_deposit_refunded',
  'advance_rent_received',
  'advance_rent_recognized',
  // receivable — money owed to the company (e.g. by a driver after an accident)
  'accident_fine_receivable_add',
  'accident_fine_receivable_paid'
]
// Which transaction type each category belongs to (keeps type and category
// consistent — e.g. a 'fuel' row can never be saved as 'income').
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

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

const num = (value) => Number(value) || 0
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}
const isPositiveAmount = (value) => Number.isFinite(Number(value)) && Number(value) > 0
const cleanName = (value) => (typeof value === 'string' ? value.trim() : '')
const orNull = (value) => (value === '' || value === undefined || value === null ? null : value)
const camelize = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      value
    ])
  )

async function withDb(handler) {
  if (!CONNECTION_STRING) {
    return json(
      {
        error:
          'Database not configured. Provision Netlify DB (netlify database) — the NETLIFY_DB_URL env var is injected automatically.'
      },
      500
    )
  }
  const sql = postgres(CONNECTION_STRING, { ssl: 'require', max: 1 })
  try {
    return await handler(sql)
  } catch (error) {
    // Turn the most common Postgres failures into readable 4xx responses.
    if (error.code === '23505') {
      const what = /email/.test(error.constraint_name || error.detail || '')
        ? 'email address'
        : 'registration number'
      return json({ error: `That ${what} is already in use.` }, 409)
    }
    if (error.code === '23503') return json({ error: 'The selected member or car no longer exists.' }, 400)
    if (['22007', '22008', '22P02'].includes(error.code)) return json({ error: 'Invalid value in the request.' }, 400)
    return json({ error: error.message }, 500)
  } finally {
    await sql.end().catch(() => {})
  }
}

/* ── Members ─────────────────────────────────────────────────────────── */

async function membersRoute(sql, method, id, body) {
  if (method === 'GET') {
    const rows = await sql`
      SELECT id, name, email, phone, role,
        to_char(joined_date, 'YYYY-MM-DD') AS joined_date, created_at
      FROM members ORDER BY name
    `
    return json({ members: rows.map(camelize) })
  }
  if (method === 'POST') {
    if (!cleanName(body.name)) return json({ error: 'Name is required' }, 400)
    if (body.role !== undefined && !MEMBER_ROLES.includes(body.role)) {
      return json({ error: 'Invalid member role' }, 400)
    }
    if (orNull(body.joined_date) && !isValidDate(body.joined_date)) return json({ error: 'Invalid joined date' }, 400)
    const [row] = await sql`
      INSERT INTO members (name, email, phone, role, joined_date)
      VALUES (${cleanName(body.name)}, ${orNull(body.email)}, ${orNull(body.phone)}, ${body.role || 'member'}, ${orNull(body.joined_date) || new Date().toISOString().slice(0, 10)})
      RETURNING *
    `
    return json({ member: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    if (body.role !== undefined && !MEMBER_ROLES.includes(body.role)) {
      return json({ error: 'Invalid member role' }, 400)
    }
    if (body.name !== undefined && !cleanName(body.name)) return json({ error: 'Name is required' }, 400)
    const [row] = await sql`
      UPDATE members SET
        name = ${body.name !== undefined ? cleanName(body.name) : sql`name`},
        email = ${body.email !== undefined ? orNull(body.email) : sql`email`},
        phone = ${body.phone !== undefined ? orNull(body.phone) : sql`phone`},
        role = ${body.role ?? sql`role`}
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return json({ error: 'Member not found' }, 404)
    return json({ member: camelize(row) })
  }
  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM members WHERE id = ${id} RETURNING id`
    if (!rows.length) return json({ error: 'Member not found' }, 404)
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed' }, 405)
}

/* ── Cars ────────────────────────────────────────────────────────────── */

async function carsRoute(sql, method, id, body) {
  if (method === 'GET') {
    const rows = await sql`
      SELECT id, name, registration_no, purchase_price,
        to_char(purchase_date, 'YYYY-MM-DD') AS purchase_date, status, created_at
      FROM cars ORDER BY name
    `
    return json({ cars: rows.map(camelize) })
  }
  if (method === 'POST') {
    if (!cleanName(body.name)) return json({ error: 'Name is required' }, 400)
    if (body.status !== undefined && !CAR_STATUSES.includes(body.status)) {
      return json({ error: 'Invalid car status' }, 400)
    }
    if (orNull(body.purchase_date) && !isValidDate(body.purchase_date)) return json({ error: 'Invalid purchase date' }, 400)
    if (num(body.purchase_price) < 0) return json({ error: 'Purchase price cannot be negative' }, 400)
    const [row] = await sql`
      INSERT INTO cars (name, registration_no, purchase_price, purchase_date, status)
      VALUES (${cleanName(body.name)}, ${orNull(body.registration_no)}, ${num(body.purchase_price)}, ${orNull(body.purchase_date)}, ${body.status || 'active'})
      RETURNING *
    `
    return json({ car: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    if (body.status !== undefined && !CAR_STATUSES.includes(body.status)) {
      return json({ error: 'Invalid car status' }, 400)
    }
    if (body.name !== undefined && !cleanName(body.name)) return json({ error: 'Name is required' }, 400)
    if (orNull(body.purchase_date) && !isValidDate(body.purchase_date)) return json({ error: 'Invalid purchase date' }, 400)
    if (body.purchase_price !== undefined && num(body.purchase_price) < 0) return json({ error: 'Purchase price cannot be negative' }, 400)
    const [row] = await sql`
      UPDATE cars SET
        name = ${body.name !== undefined ? cleanName(body.name) : sql`name`},
        registration_no = ${body.registration_no !== undefined ? orNull(body.registration_no) : sql`registration_no`},
        purchase_price = ${body.purchase_price !== undefined ? num(body.purchase_price) : sql`purchase_price`},
        purchase_date = ${body.purchase_date !== undefined ? orNull(body.purchase_date) : sql`purchase_date`},
        status = ${body.status ?? sql`status`}
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return json({ error: 'Car not found' }, 404)
    return json({ car: camelize(row) })
  }
  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM cars WHERE id = ${id} RETURNING id`
    if (!rows.length) return json({ error: 'Car not found' }, 404)
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed' }, 405)
}

/* ── Transactions ────────────────────────────────────────────────────── */

async function transactionsRoute(sql, method, id, req, body) {
  if (method === 'GET') {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const month = searchParams.get('month')
    const category = searchParams.get('category')

    // Build the WHERE clause with positional parameters (the `postgres`
    // driver has no fragment-join helper for AND in this version).
    const parts = []
    const params = []
    if (type) {
      parts.push(`t.type = $${params.length + 1}`)
      params.push(type)
    }
    if (month) {
      parts.push(`to_char(t.txn_date, 'YYYY-MM') = $${params.length + 1}`)
      params.push(month)
    }
    if (category) {
      parts.push(`t.category = $${params.length + 1}`)
      params.push(category)
    }
    const where = parts.length ? `WHERE ${parts.join(' AND ')}` : ''

    // Pagination: the Ledger loads pages of 200 (clamped 1–500) so entries
    // beyond the newest page stay reachable for viewing, editing, and deletion.
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 200, 1), 500)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    const rows = await sql.unsafe(
      `SELECT
        t.id, t.type, t.category, t.amount,
        to_char(t.txn_date, 'YYYY-MM-DD') AS txn_date,
        t.description, t.car_id, t.member_id, t.created_by,
        m.name AS member_name, c.name AS car_name
      FROM transactions t
      LEFT JOIN members m ON m.id = t.member_id
      LEFT JOIN cars c ON c.id = t.car_id
      ${where}
      ORDER BY t.txn_date DESC, t.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )
    return json({ transactions: rows.map(camelize) })
  }
  if (method === 'POST') {
    if (!body.type || !TYPES.includes(body.type)) return json({ error: 'Invalid transaction type' }, 400)
    if (!body.category || !CATEGORIES.includes(body.category)) return json({ error: 'Invalid category' }, 400)
    if (CATEGORY_TYPE[body.category] !== body.type) return json({ error: 'Category does not match the transaction type' }, 400)
    if (!isPositiveAmount(body.amount)) return json({ error: 'Amount must be greater than 0' }, 400)
    if (body.txn_date && !isValidDate(body.txn_date)) return json({ error: 'Invalid date' }, 400)

    const [row] = await sql`
      INSERT INTO transactions (type, category, amount, txn_date, description, car_id, member_id, created_by)
      VALUES (
        ${body.type},
        ${body.category},
        ${num(body.amount)},
        ${body.txn_date || new Date().toISOString().slice(0, 10)},
        ${orNull(body.description)},
        ${orNull(body.car_id)},
        ${orNull(body.member_id)},
        ${orNull(body.created_by)}
      )
      RETURNING *
    `
    return json({ transaction: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    if (body.type !== undefined && !TYPES.includes(body.type)) return json({ error: 'Invalid transaction type' }, 400)
    if (body.category !== undefined && !CATEGORIES.includes(body.category)) return json({ error: 'Invalid category' }, 400)
    if (body.amount !== undefined && !isPositiveAmount(body.amount)) return json({ error: 'Amount must be greater than 0' }, 400)
    if (body.txn_date !== undefined && !isValidDate(body.txn_date)) return json({ error: 'Invalid date' }, 400)

    // Type and category must stay consistent after a partial update too.
    if (body.type !== undefined || body.category !== undefined) {
      const [current] = await sql`SELECT type, category FROM transactions WHERE id = ${id}`
      if (!current) return json({ error: 'Transaction not found' }, 404)
      const nextType = body.type ?? current.type
      const nextCategory = body.category ?? current.category
      if (CATEGORY_TYPE[nextCategory] !== nextType) return json({ error: 'Category does not match the transaction type' }, 400)
    }

    const [row] = await sql`
      UPDATE transactions SET
        type = ${body.type ?? sql`type`},
        category = ${body.category ?? sql`category`},
        amount = ${body.amount !== undefined ? num(body.amount) : sql`amount`},
        txn_date = ${body.txn_date ?? sql`txn_date`},
        description = ${body.description !== undefined ? orNull(body.description) : sql`description`},
        car_id = ${body.car_id !== undefined ? orNull(body.car_id) : sql`car_id`},
        member_id = ${body.member_id !== undefined ? orNull(body.member_id) : sql`member_id`}
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return json({ error: 'Transaction not found' }, 404)
    return json({ transaction: camelize(row) })
  }
  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM transactions WHERE id = ${id} RETURNING id`
    if (!rows.length) return json({ error: 'Transaction not found' }, 404)
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed' }, 405)
}

/* ── Router ───────────────────────────────────────────────────────────── */

export default async (req, context) => {
  const { pathname } = new URL(req.url)
  const segments = pathname.split('/').filter(Boolean) // ['api', 'members', '3']
  const resource = segments[1]
  const id = segments[2] ? Number(segments[2]) : null

  // Access control: any signed-in user may read; only admins may write.
  const denied =
    req.method === 'GET' ? await requireUser(req, context) : await requireAdmin(req, context)
  if (denied) return denied
  if (segments[2] && !(Number.isInteger(id) && id > 0)) {
    return json({ error: 'Invalid id' }, 400)
  }

  let body = {}
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    try {
      body = await req.json()
    } catch {
      body = {}
    }
  }

  return withDb((sql) => {
    if (resource === 'members') return membersRoute(sql, req.method, id, body)
    if (resource === 'cars') return carsRoute(sql, req.method, id, body)
    if (resource === 'transactions') return transactionsRoute(sql, req.method, id, req, body)
    return json({ error: 'Unknown resource' }, 404)
  })
}

export const config = {
  path: [
    '/api/members',
    '/api/members/:id',
    '/api/cars',
    '/api/cars/:id',
    '/api/transactions',
    '/api/transactions/:id'
  ]
}
