import postgres from 'postgres'
import { requireUser } from './_shared/auth.js'

// Netlify DB (built-in Postgres) connection string is injected automatically.
// `netlify database status --show-credentials` reveals it locally.
const CONNECTION_STRING = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

const num = (value) => Number(value) || 0

export default async (req, context) => {
  // Only signed-in users may read the dashboard.
  const denied = requireUser(context)
  if (denied) return denied

  if (!CONNECTION_STRING) {
    return json(
      {
        error:
          'Database not configured. Provision Netlify DB (netlify database) and retry — the NETLIFY_DB_URL env var is injected automatically.'
      },
      500
    )
  }

  // Default to the current calendar month, e.g. 2026-07
  const now = new Date()
  const requested = new URL(req.url).searchParams.get('month')
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = MONTH_RE.test(requested) ? requested : defaultMonth

  const sql = postgres(CONNECTION_STRING, { ssl: 'require', max: 1 })

  try {
    // All-time company balance
    const [totals] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type IN ('income', 'contribution') THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN type IN ('expense', 'dividend') THEN amount ELSE 0 END), 0) AS outflow
      FROM transactions
    `

    // Selected month, split by type
    const [monthly] = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income'       THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) AS contributions,
        COALESCE(SUM(CASE WHEN type = 'expense'      THEN amount ELSE 0 END), 0) AS expenses,
        COALESCE(SUM(CASE WHEN type = 'dividend'     THEN amount ELSE 0 END), 0) AS dividends
      FROM transactions
      WHERE to_char(txn_date, 'YYYY-MM') = ${month}
    `

    // Trailing 6 months (ending at the selected month) for the trend chart
    const trend = await sql`
      SELECT to_char(txn_date, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN type IN ('income', 'contribution') THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN type IN ('expense', 'dividend') THEN amount ELSE 0 END), 0) AS outflow
      FROM transactions
      WHERE txn_date >= date_trunc('month', ${month}::date) - interval '5 months'
        AND txn_date < date_trunc('month', ${month}::date) + interval '1 month'
      GROUP BY 1
      ORDER BY 1
    `

    // Per-member investment (contributions) vs dividends received
    const members = await sql`
      SELECT m.id, m.name, m.role,
        COALESCE(SUM(CASE WHEN t.type = 'contribution' THEN t.amount ELSE 0 END), 0) AS contributions,
        COALESCE(SUM(CASE WHEN t.type = 'dividend'     THEN t.amount ELSE 0 END), 0) AS dividends
      FROM members m
      LEFT JOIN transactions t ON t.member_id = m.id
      GROUP BY m.id, m.name, m.role
      ORDER BY m.name
    `

    // Recent activity for the ledger preview
    const recent = await sql`
      SELECT id, to_char(txn_date, 'YYYY-MM-DD') AS date, type, category, description, amount
      FROM transactions
      ORDER BY txn_date DESC, id DESC
      LIMIT 8
    `

    const cars = await sql`
      SELECT status, COUNT(*)::int AS count
      FROM cars
      GROUP BY status
    `

    const inflow = num(totals.inflow)
    const outflow = num(totals.outflow)

    return json({
      asOf: now.toISOString(),
      balance: { inflow, outflow, net: inflow - outflow },
      month,
      monthly: {
        income: num(monthly.income),
        contributions: num(monthly.contributions),
        expenses: num(monthly.expenses),
        dividends: num(monthly.dividends),
        net: num(monthly.income) + num(monthly.contributions) - num(monthly.expenses)
      },
      trend: trend.map((row) => ({
        month: row.month,
        inflow: num(row.inflow),
        outflow: num(row.outflow)
      })),
      members: members.map((row) => {
        const contributions = num(row.contributions)
        const dividends = num(row.dividends)
        return {
          id: row.id,
          name: row.name,
          role: row.role,
          contributions,
          dividends,
          net: contributions - dividends
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
      cars: cars.map((row) => ({ status: row.status, count: row.count }))
    })
  } catch (error) {
    return json(
      {
        error: 'Dashboard query failed. Is the schema (db/schema.sql) applied? ' + error.message
      },
      500
    )
  } finally {
    await sql.end().catch(() => {})
  }
}

export const config = { path: '/api/dashboard' }
