import { shiftMonth } from './format'

// ── Members ────────────────────────────────────────────────────────────────

export function demoMembers() {
  return [
    { id: 1, name: 'Ade Johnson', email: 'ade.johnson@example.com', phone: '0803 123 4567', role: 'admin', joined_date: '2025-01-12' },
    { id: 2, name: 'Chinwe Okafor', email: 'chinwe.okafor@example.com', phone: '0805 234 5678', role: 'member', joined_date: '2025-02-03' },
    { id: 3, name: 'Emeka Nwosu', email: 'emeka.nwosu@example.com', phone: '0806 345 6789', role: 'member', joined_date: '2025-02-17' },
    { id: 4, name: 'Fatima Bello', email: 'fatima.bello@example.com', phone: '0807 456 7890', role: 'member', joined_date: '2025-03-08' },
    { id: 5, name: 'Ngozi Eze', email: 'ngozi.eze@example.com', phone: '0808 567 8901', role: 'member', joined_date: '2025-04-21' },
    { id: 6, name: 'Tunde Adeyemi', email: 'tunde.adeyemi@example.com', phone: '0809 678 9012', role: 'member', joined_date: '2025-05-05' }
  ]
}

// ── Cars ───────────────────────────────────────────────────────────────────

export function demoCars() {
  return [
    { id: 1, name: 'Toyota Camry — Silver', registration_no: 'LAG 123 XYZ', purchase_price: 8500000, purchase_date: '2024-06-01', status: 'active' },
    { id: 2, name: 'Toyota Axio — Black', registration_no: 'LAG 456 ABC', purchase_price: 7200000, purchase_date: '2024-09-14', status: 'active' },
    { id: 3, name: 'Honda Accord — White', registration_no: 'LAG 789 DEF', purchase_price: 6900000, purchase_date: '2024-11-02', status: 'in_repair' },
    { id: 4, name: 'Hyundai Sonata — Blue', registration_no: 'LAG 321 GHI', purchase_price: 6400000, purchase_date: '2023-04-18', status: 'sold' }
  ]
}

// ── Transactions (for a given month) ───────────────────────────────────────

export function demoTransactions(month) {
  const members = demoMembers()
  const cars = demoCars()
  const contributions = { 1: 85000, 2: 75000, 3: 95000, 4: 80000, 5: 70000, 6: 90000 }
  const rows = []

  members.forEach((m) =>
    rows.push({
      type: 'contribution',
      category: 'member_contribution',
      description: `${m.name} — monthly contribution`,
      amount: contributions[m.id],
      member_id: m.id,
      member_name: m.name,
      car_id: null,
      car_name: null,
      day: 1
    })
  )

  const rent = [
    { car_id: 1, car_name: cars[0].name, driver: 'Musa', amount: 420000, day: 2 },
    { car_id: 2, car_name: cars[1].name, driver: 'Sule', amount: 380000, day: 4 },
    { car_id: 3, car_name: cars[2].name, driver: 'Bala', amount: 360000, day: 8 }
  ]
  rent.forEach((r) =>
    rows.push({
      type: 'income',
      category: 'driver_rent',
      description: `${r.car_name} — driver rent, ${r.driver}`,
      amount: r.amount,
      member_id: null,
      member_name: null,
      car_id: r.car_id,
      car_name: r.car_name,
      day: r.day
    })
  )

  const expenses = [
    { category: 'car_maintenance', description: 'Axio — brake pads + service', amount: 128500, car_id: 2, day: 6 },
    { category: 'insurance', description: 'Comprehensive — Camry', amount: 118000, car_id: 1, day: 10 },
    { category: 'fuel', description: 'Fuel — Axio', amount: 45000, car_id: 2, day: 12 },
    { category: 'office_expense', description: 'Office rent', amount: 60000, car_id: null, day: 15 }
  ]
  const carName = (id) => (id ? cars.find((c) => c.id === id)?.name || null : null)
  expenses.forEach((e) =>
    rows.push({
      type: 'expense',
      category: e.category,
      description: e.description,
      amount: e.amount,
      member_id: null,
      member_name: null,
      car_id: e.car_id,
      car_name: carName(e.car_id),
      day: e.day
    })
  )

  const totalContributions = Object.values(contributions).reduce((a, b) => a + b, 0)
  const dividendPool = Math.round(totalContributions * 0.5)
  members.forEach((m) =>
    rows.push({
      type: 'dividend',
      category: 'dividend_payout',
      description: `${m.name} — dividend payout`,
      amount: Math.round((contributions[m.id] / totalContributions) * dividendPool),
      member_id: m.id,
      member_name: m.name,
      car_id: null,
      car_name: null,
      day: 25
    })
  )

  return rows
    .map((r, i) => {
      const { day, ...rest } = r
      return { id: i + 1, date: `${month}-${String(day).padStart(2, '0')}`, ...rest }
    })
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))
}

// ── Dashboard aggregate (mirrors GET /api/dashboard) ───────────────────────

export function demoData(month) {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5))
  const trend = months.map((m, i) => ({
    month: m,
    inflow: 1_650_000 + i * 92_000,
    outflow: 955_000 + i * 63_000
  }))

  const last = trend[trend.length - 1]
  const monthly = {
    income: Math.round(last.inflow * 0.68),
    contributions: Math.round(last.inflow * 0.32),
    expenses: Math.round(last.outflow * 0.72),
    dividends: Math.round(last.outflow * 0.28)
  }
  monthly.net = monthly.income + monthly.contributions - monthly.expenses

  const inflow = trend.reduce((sum, t) => sum + t.inflow, 0)
  const outflow = trend.reduce((sum, t) => sum + t.outflow, 0)

  const contributions = { 1: 640000, 2: 520000, 3: 580000, 4: 610000, 5: 550000, 6: 470000 }
  const dividends = { 1: 312500, 2: 260000, 3: 275000, 4: 290000, 5: 268750, 6: 230000 }
  const members = demoMembers().map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    contributions: contributions[m.id],
    dividends: dividends[m.id],
    net: contributions[m.id] - dividends[m.id]
  }))

  return {
    asOf: new Date().toISOString(),
    balance: { inflow, outflow, net: inflow - outflow },
    month,
    monthly,
    trend,
    members,
    recent: demoTransactions(month).slice(0, 8),
    cars: [
      { status: 'active', count: 2 },
      { status: 'in_repair', count: 1 },
      { status: 'sold', count: 1 }
    ]
  }
}
