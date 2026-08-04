import postgres from 'postgres'

const CONNECTION_STRING = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL

const TYPES = ['income', 'expense', 'contribution', 'dividend']
const CATEGORIES = [
  'driver_rent',
  'other_income',
  'member_contribution',
  'car_maintenance',
  'insurance',
  'registration',
  'fuel',
  'office_expense',
  'dividend_payout'
]
const CAR_STATUSES = ['active', 'in_repair', 'sold']

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

const num = (value) => Number(value) || 0
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
    return json({ error: error.message }, 500)
  } finally {
    await sql.end().catch(() => {})
  }
}

/* ── Members ─────────────────────────────────────────────────────────── */

async function membersRoute(sql, method, id, body) {
  if (method === 'GET') {
    const rows = await sql`SELECT * FROM members ORDER BY name`
    return json({ members: rows.map(camelize) })
  }
  if (method === 'POST') {
    const [row] = await sql`
      INSERT INTO members (name, email, phone, role, joined_date)
      VALUES (${body.name}, ${orNull(body.email)}, ${orNull(body.phone)}, ${body.role || 'member'}, ${orNull(body.joined_date) || new Date().toISOString().slice(0, 10)})
      RETURNING *
    `
    return json({ member: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    const [row] = await sql`
      UPDATE members SET
        name = ${body.name ?? sql`name`},
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
    await sql`DELETE FROM members WHERE id = ${id}`
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed' }, 405)
}

/* ── Cars ────────────────────────────────────────────────────────────── */

async function carsRoute(sql, method, id, body) {
  if (method === 'GET') {
    const rows = await sql`SELECT * FROM cars ORDER BY name`
    return json({ cars: rows.map(camelize) })
  }
  if (method === 'POST') {
    const [row] = await sql`
      INSERT INTO cars (name, registration_no, purchase_price, purchase_date, status)
      VALUES (${body.name}, ${orNull(body.registration_no)}, ${num(body.purchase_price)}, ${orNull(body.purchase_date)}, ${body.status || 'active'})
      RETURNING *
    `
    return json({ car: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    if (body.status && !CAR_STATUSES.includes(body.status)) {
      return json({ error: 'Invalid car status' }, 400)
    }
    const [row] = await sql`
      UPDATE cars SET
        name = ${body.name ?? sql`name`},
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
    await sql`DELETE FROM cars WHERE id = ${id}`
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

    const conditions = []
    if (type) conditions.push(sql`t.type = ${type}`)
    if (month) conditions.push(sql`to_char(t.txn_date, 'YYYY-MM') = ${month}`)
    if (category) conditions.push(sql`t.category = ${category}`)

    const where = conditions.length ? sql`WHERE ${sql(conditions, ' AND ')}` : sql``

    const rows = await sql`
      SELECT t.*, m.name AS member_name, c.name AS car_name
      FROM transactions t
      LEFT JOIN members m ON m.id = t.member_id
      LEFT JOIN cars c ON c.id = t.car_id
      ${where}
      ORDER BY t.txn_date DESC, t.id DESC
      LIMIT 200
    `
    return json({ transactions: rows.map(camelize) })
  }
  if (method === 'POST') {
    if (!TYPES.includes(body.type)) return json({ error: 'Invalid transaction type' }, 400)
    if (!CATEGORIES.includes(body.category)) return json({ error: 'Invalid category' }, 400)
    if (!num(body.amount) || num(body.amount) <= 0) return json({ error: 'Amount must be greater than 0' }, 400)

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
    if (body.type && !TYPES.includes(body.type)) return json({ error: 'Invalid transaction type' }, 400)
    if (body.category && !CATEGORIES.includes(body.category)) return json({ error: 'Invalid category' }, 400)
    if (body.amount !== undefined && num(body.amount) <= 0) return json({ error: 'Amount must be greater than 0' }, 400)

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
    await sql`DELETE FROM transactions WHERE id = ${id}`
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
