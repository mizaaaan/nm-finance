const moneyFmt = new Intl.NumberFormat('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const compactFmt = new Intl.NumberFormat('en-NG', {
  notation: 'compact',
  maximumFractionDigits: 1
})

export function formatMoney(value) {
  return moneyFmt.format(Number(value) || 0)
}

export function formatCompact(value) {
  return compactFmt.format(Number(value) || 0)
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function shortMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short' })
}

// Local-time YYYY-MM-DD (toISOString would give the UTC date, which is the
// previous day for early-morning entries east of UTC, e.g. Bangladesh).
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// True when a transaction moves cash OUT of the company (matches the
// dashboard's outflow logic: expenses, dividends and deposit refunds).
export function isOutflow(type, category) {
  return type === 'expense' || type === 'dividend' || category === 'security_deposit_refunded'
}
