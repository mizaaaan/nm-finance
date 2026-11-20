import { authorize } from './_shared/auth.js'
import { withDb } from './_shared/db.js'
import { json, readJson } from './_shared/http.js'
import {
  CAR_STATUSES,
  CATEGORIES,
  CATEGORY_TYPE,
  LIMITS,
  MEMBER_ROLES,
  MEMBER_TYPES,
  MONTH_RE,
  TYPES,
  cleanText,
  isPositiveInt,
  isValidAmount,
  isValidDate,
  isValidEmail,
  isValidNonNegativeAmount,
  orNull,
  parseOptionalId
} from './_shared/validate.js'

// REST API for members, cars and transactions.
//   GET            → any approved account (admin or member)
//   POST/PATCH/PUT/DELETE → admins only
// Every handler validates its input; the database constraints are a second line
// of defence, not the first.

const camelize = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      value
    ])
  )

const bad = (message) => json({ error: message }, 400)
const today = () => new Date().toISOString().slice(0, 10)

/* ── Members ─────────────────────────────────────────────────────────── */

// Returns an error message, or null when the (possibly partial) member is valid.
function validateMember(body, { partial }) {
  const has = (key) => body[key] !== undefined
  if (!partial || has('name')) {
    const name = cleanText(body.name)
    if (!name) return 'Name is required.'
    if (name.length > LIMITS.name) return `Name must be ${LIMITS.name} characters or fewer.`
  }
  if (has('email')) {
    const email = orNull(body.email)
    if (email !== null && !isValidEmail(email)) return 'Enter a valid email address.'
  }
  if (has('phone')) {
    const phone = orNull(body.phone)
    if (phone !== null && (typeof phone !== 'string' || phone.length > LIMITS.phone)) {
      return `Phone must be ${LIMITS.phone} characters or fewer.`
    }
  }
  if (has('role') && !MEMBER_ROLES.includes(body.role)) return 'Invalid member role.'
  if (has('joined_date')) {
    const joined = orNull(body.joined_date)
    if (joined === null && partial) return 'Joined date cannot be empty.'
    if (joined !== null && !isValidDate(joined)) return 'Invalid joined date.'
  }
  return null
}

// Emails are stored lower-case so "A@x.com" and "a@x.com" can't both exist.
const emailValue = (value) => {
  const email = orNull(value)
  return email === null ? null : email.toLowerCase()
}

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
    const error = validateMember(body, { partial: false })
    if (error) return bad(error)
    const [row] = await sql`
      INSERT INTO members (name, email, phone, role, joined_date)
      VALUES (
        ${cleanText(body.name)},
        ${emailValue(body.email)},
        ${orNull(body.phone)},
        ${body.role || 'member'},
        ${orNull(body.joined_date) || today()}
      )
      RETURNING *
    `
    return json({ member: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    const error = validateMember(body, { partial: true })
    if (error) return bad(error)
    const [row] = await sql`
      UPDATE members SET
        name = ${body.name !== undefined ? cleanText(body.name) : sql`name`},
        email = ${body.email !== undefined ? emailValue(body.email) : sql`email`},
        phone = ${body.phone !== undefined ? orNull(body.phone) : sql`phone`},
        role = ${body.role !== undefined ? body.role : sql`role`},
        joined_date = ${body.joined_date !== undefined ? orNull(body.joined_date) : sql`joined_date`}
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return json({ error: 'Member not found.' }, 404)
    return json({ member: camelize(row) })
  }
  if (method === 'DELETE' && id) {
    // A member's contributions and dividends ARE their investment record.
    // Deleting the member would silently detach those rows (the totals would
    // still count them, but nobody would own them), so it is refused while any
    // exist. One atomic statement — no gap between the check and the delete.
    const deleted = await sql`
      DELETE FROM members m
      WHERE m.id = ${id}
        AND NOT EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.member_id = m.id AND t.type = ANY(${MEMBER_TYPES})
        )
      RETURNING m.id
    `
    if (deleted.length) return json({ ok: true })
    const [exists] = await sql`SELECT id FROM members WHERE id = ${id}`
    if (!exists) return json({ error: 'Member not found.' }, 404)
    return json(
      {
        error:
          'This member has contributions or dividends on record, so they cannot be deleted without losing the investment history. Delete or reassign those entries first.'
      },
      409
    )
  }
  return json({ error: 'Method not allowed.' }, 405)
}

/* ── Cars ────────────────────────────────────────────────────────────── */

function validateCar(body, { partial }) {
  const has = (key) => body[key] !== undefined
  if (!partial || has('name')) {
    const name = cleanText(body.name)
    if (!name) return 'Name is required.'
    if (name.length > LIMITS.name) return `Name must be ${LIMITS.name} characters or fewer.`
  }
  if (has('registration_no')) {
    const reg = orNull(body.registration_no)
    if (reg !== null && (typeof reg !== 'string' || reg.length > LIMITS.registration)) {
      return `Registration number must be ${LIMITS.registration} characters or fewer.`
    }
  }
  if (has('status') && !CAR_STATUSES.includes(body.status)) return 'Invalid car status.'
  if (has('purchase_date')) {
    const date = orNull(body.purchase_date)
    if (date !== null && !isValidDate(date)) return 'Invalid purchase date.'
  }
  if (has('purchase_price') && !isValidNonNegativeAmount(body.purchase_price ?? 0)) {
    return 'Purchase price must be 0 or more, with at most 2 decimal places.'
  }
  return null
}

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
    const error = validateCar(body, { partial: false })
    if (error) return bad(error)
    const [row] = await sql`
      INSERT INTO cars (name, registration_no, purchase_price, purchase_date, status)
      VALUES (
        ${cleanText(body.name)},
        ${orNull(body.registration_no)},
        ${Number(body.purchase_price) || 0},
        ${orNull(body.purchase_date)},
        ${body.status || 'active'}
      )
      RETURNING *
    `
    return json({ car: camelize(row) }, 201)
  }
  if ((method === 'PATCH' || method === 'PUT') && id) {
    const error = validateCar(body, { partial: true })
    if (error) return bad(error)
    const [row] = await sql`
      UPDATE cars SET
        name = ${body.name !== undefined ? cleanText(body.name) : sql`name`},
        registration_no = ${body.registration_no !== undefined ? orNull(body.registration_no) : sql`registration_no`},
        purchase_price = ${body.purchase_price !== undefined ? Number(body.purchase_price) || 0 : sql`purchase_price`},
        purchase_date = ${body.purchase_date !== undefined ? orNull(body.purchase_date) : sql`purchase_date`},
        status = ${body.status !== undefined ? body.status : sql`status`}
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return json({ error: 'Car not found.' }, 404)
    return json({ car: camelize(row) })
  }
  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM cars WHERE id = ${id} RETURNING id`
    if (!rows.length) return json({ error: 'Car not found.' }, 404)
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed.' }, 405)
}

/* ── Transactions ────────────────────────────────────────────────────── */

// Validates a transaction after merging a partial update onto the stored row.
// `merged` has the final type/category/member_id the row would end up with.
function validateTransactionShape(merged) {
  if (!TYPES.includes(merged.type)) return 'Invalid transaction type.'
  if (!CATEGORIES.includes(merged.category)) return 'Invalid category.'
  if (CATEGORY_TYPE[merged.category] !== merged.type) {
    return 'Category does not match the transaction type.'
  }
  if (MEMBER_TYPES.includes(merged.type) && !merged.member_id) {
    return 'Choose the member this contribution or dividend belongs to.'
  }
  return null
}

function validateTransactionFields(body, { partial }) {
  const has = (key) => body[key] !== undefined
  if (!partial || has('amount')) {
    if (!isValidAmount(body.amount)) {
      return 'Amount must be greater than 0, with at most 2 decimal places.'
    }
  }
  if (!partial || has('txn_date')) {
    if (partial || body.txn_date) {
      if (!isValidDate(body.txn_date)) return 'Invalid date.'
    }
  }
  if (has('description')) {
    const description = orNull(body.description)
    if (description !== null && (typeof description !== 'string' || description.length > LIMITS.description)) {
      return `Description must be ${LIMITS.description} characters or fewer.`
    }
  }
  if (has('car_id') && parseOptionalId(body.car_id) === undefined) return 'Invalid car.'
  if (has('member_id') && parseOptionalId(body.member_id) === undefined) return 'Invalid member.'
  return null
}

async function transactionsRoute(sql, method, id, req, body) {
  if (method === 'GET') {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const month = searchParams.get('month')
    const category = searchParams.get('category')

    if (type && !TYPES.includes(type)) return bad('Invalid type filter.')
    if (category && !CATEGORIES.includes(category)) return bad('Invalid category filter.')
    if (month && !MONTH_RE.test(month)) return bad('Invalid month filter (use YYYY-MM).')

    // Build the WHERE clause with positional parameters — every value is bound,
    // never concatenated into the SQL text.
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
    const fieldError = validateTransactionFields(body, { partial: false })
    if (fieldError) return bad(fieldError)
    const merged = {
      type: body.type,
      category: body.category,
      member_id: parseOptionalId(body.member_id)
    }
    const shapeError = validateTransactionShape(merged)
    if (shapeError) return bad(shapeError)

    // created_by is deliberately NOT taken from the request: a client-supplied
    // value would let any admin attribute an entry to somebody else.
    const [row] = await sql`
      INSERT INTO transactions (type, category, amount, txn_date, description, car_id, member_id)
      VALUES (
        ${body.type},
        ${body.category},
        ${Number(body.amount)},
        ${body.txn_date || today()},
        ${orNull(body.description)},
        ${parseOptionalId(body.car_id)},
        ${merged.member_id}
      )
      RETURNING *
    `
    return json({ transaction: camelize(row) }, 201)
  }

  if ((method === 'PATCH' || method === 'PUT') && id) {
    const fieldError = validateTransactionFields(body, { partial: true })
    if (fieldError) return bad(fieldError)

    // Type, category and member must stay consistent after a partial update too.
    if (body.type !== undefined || body.category !== undefined || body.member_id !== undefined) {
      const [current] = await sql`SELECT type, category, member_id FROM transactions WHERE id = ${id}`
      if (!current) return json({ error: 'Transaction not found.' }, 404)
      const shapeError = validateTransactionShape({
        type: body.type ?? current.type,
        category: body.category ?? current.category,
        member_id: body.member_id !== undefined ? parseOptionalId(body.member_id) : current.member_id
      })
      if (shapeError) return bad(shapeError)
    }

    const [row] = await sql`
      UPDATE transactions SET
        type = ${body.type !== undefined ? body.type : sql`type`},
        category = ${body.category !== undefined ? body.category : sql`category`},
        amount = ${body.amount !== undefined ? Number(body.amount) : sql`amount`},
        txn_date = ${body.txn_date !== undefined ? body.txn_date : sql`txn_date`},
        description = ${body.description !== undefined ? orNull(body.description) : sql`description`},
        car_id = ${body.car_id !== undefined ? parseOptionalId(body.car_id) : sql`car_id`},
        member_id = ${body.member_id !== undefined ? parseOptionalId(body.member_id) : sql`member_id`}
      WHERE id = ${id}
      RETURNING *
    `
    if (!row) return json({ error: 'Transaction not found.' }, 404)
    return json({ transaction: camelize(row) })
  }

  if (method === 'DELETE' && id) {
    const rows = await sql`DELETE FROM transactions WHERE id = ${id} RETURNING id`
    if (!rows.length) return json({ error: 'Transaction not found.' }, 404)
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed.' }, 405)
}

/* ── Router ───────────────────────────────────────────────────────────── */

const WRITE_METHODS = ['POST', 'PATCH', 'PUT']

export default async (req, context) => {
  const { pathname } = new URL(req.url)
  const segments = pathname.split('/').filter(Boolean) // ['api', 'members', '3']
  const resource = segments[1]

  // Access control: any approved account may read; only admins may write.
  const { response: denied } = await authorize(req, context, req.method === 'GET' ? 'read' : 'admin')
  if (denied) return denied

  const id = segments[2] ? Number(segments[2]) : null
  if (segments[2] && !isPositiveInt(id)) return json({ error: 'Invalid id.' }, 400)

  let body = {}
  if (WRITE_METHODS.includes(req.method)) {
    const parsed = await readJson(req)
    if (parsed.response) return parsed.response
    body = parsed.body
  }

  return withDb((sql) => {
    if (resource === 'members') return membersRoute(sql, req.method, id, body)
    if (resource === 'cars') return carsRoute(sql, req.method, id, body)
    if (resource === 'transactions') return transactionsRoute(sql, req.method, id, req, body)
    return json({ error: 'Unknown resource.' }, 404)
  }, `api/${resource}`)
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
