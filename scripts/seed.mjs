import postgres from 'postgres'

// ── Seed: Next Millionaire Finance accounting data (Apr–Jul 2026) ──
//
// Sources from the user's General Journal, Statement of Profit/Loss,
// Balance Sheet, and Cash Flow Statement. 92 double-entry journal entries
// are mapped to the app's single-entry transaction model:
//
//   • Share capital   → contribution / member_contribution
//   • Rental income   → income       / driver_rent
//   • Toy income      → income       / other_income
//   • Operating costs → expense      / (various)
//   • Car purchases   → cars table   (capital, not expense)
//   • Deposits        → liability    / security_deposit_received | refunded
//   • Accident        → receivable   / accident_fine_receivable_add | paid
//
// ── Accounting note ───────────────────────────────────────────────────
// The app is single-entry / cash-basis. The user's double-entry journal
// nets the accident repair against a receivable credit (zero net P&L
// impact for that event). Here the repair IS recorded as a cash expense
// and the driver's obligation appears as a receivable — the dashboard
// profit/loss differs from the accrual P&L by that amount. The receivable
// balance and liability balance are tracked separately on the dashboard.

const DB = process.env.DATABASE_URL
if (!DB) {
  console.error('DATABASE_URL not set. Source .env or export it.')
  process.exit(1)
}

const sql = postgres(DB, { ssl: 'require', max: 1 })

async function seed() {
  // ── 1. Members ──────────────────────────────────────────────────────
  console.log('Creating members…')
  const [member] = await sql`
    INSERT INTO members (name, role, joined_date)
    VALUES ('Owners / Shareholders', 'admin', '2026-04-01')
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `
  const memberId = member.id
  console.log(`  member id=${memberId}`)

  // ── 2. Cars ─────────────────────────────────────────────────────────
  console.log('Creating cars…')
  const carData = [
    { name: 'Vehicle 1', price: 39400, date: '2026-04-23' },
    { name: 'Vehicle 2', price: 51900, date: '2026-05-16' },
    { name: 'Vehicle 3', price: 23821, date: '2026-06-26' },
    { name: 'Vehicle 4', price: 18700, date: '2026-07-16' }
  ]
  const carIds = []
  for (const c of carData) {
    const [car] = await sql`
      INSERT INTO cars (name, purchase_price, purchase_date, status)
      VALUES (${c.name}, ${c.price}, ${c.date}, 'active')
      RETURNING id
    `
    carIds.push(car.id)
    console.log(`  ${c.name}: id=${car.id}  price=${c.price.toLocaleString()}  date=${c.date}`)
  }

  // ── 3. Transactions ─────────────────────────────────────────────────
  console.log('Inserting transactions…')
  let count = 0

  const tx = (type, category, amount, date, description, opts = {}) => ({
    type,
    category,
    amount,
    txn_date: date,
    description,
    member_id: opts.member_id ?? null,
    car_id: opts.car_id ?? null,
    created_by: opts.created_by ?? null
  })

  const rows = [
    // ── April 2026 ──────────────────────────────────────────────────
    tx('contribution', 'member_contribution', 69000, '2026-04-01', 'Share capital received', { member_id: memberId }),
    tx('income', 'other_income', 42, '2026-04-29', 'Toy sale income'),
    tx('income', 'driver_rent', 1776, '2026-04-30', 'Rental income received'),
    tx('expense', 'registration', 500, '2026-04-24', 'Uber registration'),
    tx('expense', 'car_maintenance', 100, '2026-04-24', 'Oil change'),
    tx('expense', 'food_entertainment', 162, '2026-04-26', 'Food for meeting'),
    tx('expense', 'transportation', 225, '2026-04-26', 'Toy delivery cost'),
    tx('expense', 'transportation', 40, '2026-04-27', 'Transportation'),
    tx('expense', 'mobile_internet', 50, '2026-04-27', 'Mobile bill'),
    tx('expense', 'car_maintenance', 306, '2026-04-27', 'Toyota servicing'),

    // ── May 2026 ────────────────────────────────────────────────────
    tx('contribution', 'member_contribution', 24500, '2026-05-01', 'Share capital received', { member_id: memberId }),
    tx('liability', 'security_deposit_received', 2500, '2026-05-10', 'Security deposit received'),
    tx('income', 'other_income', 30, '2026-05-20', 'Toy sale income'),
    tx('expense', 'transportation', 135, '2026-05-17', 'Petrol expense'),
    tx('expense', 'car_maintenance', 1115, '2026-05-19', 'Car servicing'),
    tx('expense', 'registration', 150, '2026-05-07', 'Istemara change / registration'),
    tx('expense', 'food_entertainment', 114, '2026-05-10', 'Food for meeting'),
    tx('expense', 'transportation', 20, '2026-05-14', 'Taxi cost'),
    tx('expense', 'mobile_internet', 20, '2026-05-17', 'Internet bill'),

    // ── June 2026 ───────────────────────────────────────────────────
    tx('contribution', 'member_contribution', 24000, '2026-06-01', 'Share capital received', { member_id: memberId }),
    tx('liability', 'security_deposit_received', 3000, '2026-06-20', 'Security deposit received'),
    tx('income', 'driver_rent', 5430, '2026-06-15', 'Rental income received'),
    tx('expense', 'car_maintenance', 3330, '2026-06-14', 'Car servicing'),
    tx('expense', 'transportation', 199, '2026-06-30', 'Car fuel cost'),
    tx('liability', 'security_deposit_refunded', 870, '2026-06-15', 'Security deposit returned'),
    tx('expense', 'food_entertainment', 45, '2026-06-13', 'Food for meeting'),
    tx('expense', 'mobile_internet', 65, '2026-06-04', 'Mobile bill paid'),
    tx('expense', 'office_expense', 250, '2026-06-16', 'Traffic violation fine'),
    tx('expense', 'office_expense', 100, '2026-06-13', 'Paid to beat box'),

    // ── July 2026 ───────────────────────────────────────────────────
    tx('contribution', 'member_contribution', 25350, '2026-07-01', 'Share capital received', { member_id: memberId }),
    tx('liability', 'security_deposit_received', 1000, '2026-07-08', 'Security deposit received'),
    tx('income', 'driver_rent', 5880, '2026-07-20', 'Rental income received'),
    tx('receivable', 'accident_fine_receivable_paid', 2200, '2026-07-25', 'Accident cash received from driver'),
    tx('expense', 'car_maintenance', 3865, '2026-07-01', 'Accident car repair (paid in cash)'),
    tx('receivable', 'accident_fine_receivable_add', 3865, '2026-07-01', 'Driver owes for accident repair'),
    tx('expense', 'car_maintenance', 10362, '2026-07-31', 'Car servicing'),
    tx('expense', 'transportation', 320, '2026-07-31', 'Fuel cost for meeting'),
    tx('expense', 'registration', 1800, '2026-07-23', 'Car registration'),
    tx('expense', 'food_entertainment', 70, '2026-07-07', 'Food for meeting'),
    tx('receivable', 'accident_fine_receivable_add', 850, '2026-07-27', 'Fine paid on behalf of driver'),
    tx('expense', 'mobile_internet', 65, '2026-07-02', 'Internet bill'),
    tx('expense', 'food_entertainment', 950, '2026-07-20', 'Company event food'),
  ]

  for (const r of rows) {
    await sql`
      INSERT INTO transactions (type, category, amount, txn_date, description, car_id, member_id, created_by)
      VALUES (${r.type}, ${r.category}, ${r.amount}, ${r.txn_date}, ${r.description},
              ${r.car_id}, ${r.member_id}, ${r.created_by})
    `
    count++
  }

  console.log(`  ${count} transactions inserted`)

  // ── 4. Verification ──────────────────────────────────────────────────
  console.log('\n── Verification ──')

  const [totals] = await sql`
    SELECT
      COUNT(*)::int AS tx_count,
      COALESCE(SUM(CASE WHEN type = 'income'       THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'contribution' THEN amount ELSE 0 END), 0) AS contributions,
      COALESCE(SUM(CASE WHEN type = 'expense'      THEN amount ELSE 0 END), 0) AS expenses,
      COALESCE(SUM(CASE WHEN type = 'liability' AND category = 'security_deposit_received' THEN amount ELSE 0 END), 0) AS deposits_in,
      COALESCE(SUM(CASE WHEN type = 'liability' AND category = 'security_deposit_refunded' THEN amount ELSE 0 END), 0) AS deposits_out,
      COALESCE(SUM(CASE WHEN type = 'receivable' AND category = 'accident_fine_receivable_add' THEN amount ELSE 0 END), 0) AS receivable_add,
      COALESCE(SUM(CASE WHEN type = 'receivable' AND category = 'accident_fine_receivable_paid' THEN amount ELSE 0 END), 0) AS receivable_paid
    FROM transactions
  `

  const [carTotal] = await sql`SELECT COALESCE(SUM(purchase_price),0)::numeric AS total FROM cars`
  const [memCount] = await sql`SELECT COUNT(*)::int AS count FROM members`

  console.log(`  Transactions:  ${totals.tx_count}`)
  console.log(`  Members:       ${memCount.count}`)
  console.log(`  Cars:          ${carIds.length}  (total purchase: ${Number(carTotal.total).toLocaleString()})`)
  console.log()
  console.log(`  Income:         ${Number(totals.income).toLocaleString()}  (expect 13,158)`)
  console.log(`  Contributions:  ${Number(totals.contributions).toLocaleString()}  (expect 142,850)`)
  console.log(`  Expenses:       ${Number(totals.expenses).toLocaleString()}  (expect 20,493)`)
  console.log(`  Deposits in:    ${Number(totals.deposits_in).toLocaleString()}  (expect 6,500)`)
  console.log(`  Deposits out:   ${Number(totals.deposits_out).toLocaleString()}  (expect 870)`)
  console.log(`  Receivable add: ${Number(totals.receivable_add).toLocaleString()}  (expect 4,715)`)
  console.log(`  Receivable paid:${Number(totals.receivable_paid).toLocaleString()}  (expect 2,200)`)
  console.log()
  console.log(`  Liability net:  ${(Number(totals.deposits_in) - Number(totals.deposits_out)).toLocaleString()}  (expect 5,630)`)
  console.log(`  Receivable net: ${(Number(totals.receivable_add) - Number(totals.receivable_paid)).toLocaleString()}  (expect 2,515)`)
  console.log(`  App cash bal:   ${(Number(totals.income) + Number(totals.contributions) + Number(totals.deposits_in) + Number(totals.receivable_paid) - Number(totals.expenses) - Number(totals.deposits_out)).toLocaleString()}`)
  console.log(`  (Actual cash: 4,809 — difference is car purchases & non-cash items)`)
}

seed()
  .then(() => { console.log('\n✓ Seed complete.'); process.exit(0) })
  .catch((err) => { console.error('Seed failed:', err.message); process.exit(1) })
  .finally(() => sql.end().catch(() => {}))
