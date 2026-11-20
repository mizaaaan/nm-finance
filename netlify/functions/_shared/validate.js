// Pure input validation helpers (no I/O) shared by the API functions.

export const TYPES = ['income', 'expense', 'contribution', 'dividend', 'liability', 'receivable']

// Which transaction type each category belongs to (keeps type and category
// consistent — e.g. a 'fuel' row can never be saved as 'income'). This is the
// single source of truth for categories; keep db/schema.sql's comment and the
// category labels in src/pages/Ledger.jsx in step with it.
export const CATEGORY_TYPE = {
  // income
  driver_rent: 'income',
  other_income: 'income',
  // contribution
  member_contribution: 'contribution',
  // expense
  car_maintenance: 'expense',
  insurance: 'expense',
  registration: 'expense',
  fuel: 'expense',
  office_expense: 'expense',
  transportation: 'expense',
  food_entertainment: 'expense',
  mobile_internet: 'expense',
  depreciation: 'expense',
  // dividend
  dividend_payout: 'dividend',
  // liability — cash held that isn't company income yet
  security_deposit_received: 'liability',
  security_deposit_refunded: 'liability',
  advance_rent_received: 'liability',
  advance_rent_recognized: 'liability',
  // receivable — money owed to the company (e.g. by a driver after an accident)
  accident_fine_receivable_add: 'receivable',
  accident_fine_receivable_paid: 'receivable'
}
export const CATEGORIES = Object.keys(CATEGORY_TYPE)

// Types that must be attributed to a member (their investment / payout record).
export const MEMBER_TYPES = ['contribution', 'dividend']

export const CAR_STATUSES = ['active', 'in_repair', 'sold']
export const MEMBER_ROLES = ['member', 'admin']

export const LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  registration: 40,
  description: 500
}

// NUMERIC(12,2) holds up to 9,999,999,999.99.
export const MAX_AMOUNT = 9999999999.99

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function isValidEmail(value) {
  return typeof value === 'string' && value.length <= LIMITS.email && EMAIL_RE.test(value)
}

// A positive money amount with at most 2 decimal places, within column range.
export function isValidAmount(value) {
  if (typeof value === 'string' && !value.trim()) return false
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return false
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-6
}

// Optional money amount: 0 is allowed (e.g. an unknown purchase price).
export function isValidNonNegativeAmount(value) {
  return Number(value) === 0 || isValidAmount(value)
}

export const isPositiveInt = (value) => Number.isInteger(value) && value > 0

// Trimmed string, or '' for anything that isn't a string.
export const cleanText = (value) => (typeof value === 'string' ? value.trim() : '')

// '' / undefined / null → null; strings are trimmed; other types pass through
// so the validators can reject them.
export function orNull(value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim()
  return value
}

// Optional foreign key: null/'' → null, a positive integer (or numeric string)
// → number, anything else → undefined (invalid).
export function parseOptionalId(value) {
  const v = orNull(value)
  if (v === null) return null
  const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v
  return isPositiveInt(n) ? n : undefined
}
