import { authorize } from './_shared/auth.js'
import { withDb } from './_shared/db.js'
import { json } from './_shared/http.js'
import { MONTH_RE } from './_shared/validate.js'

const num = (value) => Number(value) || 0

export default async (req, context) => {
  // Only approved accounts (admin or member) may read the dashboard.
  const { response: denied } = await authorize(req, context, 'read')
  if (denied) return denied

  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)

  // Default to the current calendar month, e.g. 2026-07
  const now = new Date()
  const requested = new URL(req.url).searchParams.get('month')
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const month = MONTH_RE.test(requested) ? requested : defaultMonth

  return withDb(async (sql) => {
    // All-time company cash balance. Liability/receivable rows move real cash
    // (a deposit received, a driver repaying an accident cost) but are NOT
    // income or expense — the categories below say which side of the ledger
    // each one lands on. Profit (below) stays untouched by these.
    const [totals] = await sql`
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
    `

    // Outstanding liability (money held that isn't ours yet) and receivable
    // (money owed to us) balances — mirrors the "Customer Security Deposit"
    // and "Accident Recovery Receivable" figures on your account file.
    const [balances] = await sql`
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

    // Trailing 6 months (ending at the selected month) for the trend chart.
    // generate_series guarantees one row per calendar month (zero-filled when
    // there are no transactions), so the chart axis is complete and the
    // dashboard's "vs previous month" delta compares true calendar months.
    const trend = await sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', ${month + '-01'}::date) - interval '5 months',
          date_trunc('month', ${month + '-01'}::date),
          interval '1 month'
        ) AS month_start
      )
      SELECT to_char(months.month_start, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.type IN ('income', 'contribution') THEN t.amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN t.type IN ('expense', 'dividend') THEN t.amount ELSE 0 END), 0) AS outflow
      FROM months
      LEFT JOIN transactions t
        ON t.txn_date >= months.month_start
        AND t.txn_date < months.month_start + interval '1 month'
      GROUP BY months.month_start
      ORDER BY months.month_start
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
      liabilityBalance: num(balances.liability_balance),
      receivableBalance: num(balances.receivable_balance),
      month,
      monthly: {
        income: num(monthly.income),
        contributions: num(monthly.contributions),
        expenses: num(monthly.expenses),
        dividends: num(monthly.dividends),
        // Net = money in (income + contributions) − money out (expenses + dividends),
        // consistent with the all-time balance (inflow − outflow).
        net:
          num(monthly.income) +
          num(monthly.contributions) -
          num(monthly.expenses) -
          num(monthly.dividends)
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
  }, 'api/dashboard')
}

export const config = { path: '/api/dashboard' }
