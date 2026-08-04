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
