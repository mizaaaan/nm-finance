import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import Modal from '../components/Modal'
import { Field, SelectField, ErrorBanner } from '../components/Field'
import TypeChip from '../components/TypeChip'
import { useApi } from '../hooks/useApi'
import { apiRequest, ApiError } from '../lib/api'
import { formatMoney, currentMonth } from '../lib/format'
import { demoMembers, demoCars, demoTransactions } from '../lib/demoData'

const CATEGORIES_BY_TYPE = {
  income: [
    { value: 'driver_rent', label: 'Driver rent' },
    { value: 'other_income', label: 'Other income' }
  ],
  contribution: [{ value: 'member_contribution', label: 'Member contribution' }],
  expense: [
    { value: 'car_maintenance', label: 'Car maintenance' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'registration', label: 'Registration' },
    { value: 'fuel', label: 'Fuel' },
    { value: 'office_expense', label: 'Office expense' }
  ],
  dividend: [{ value: 'dividend_payout', label: 'Dividend payout' }]
}

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'contribution', label: 'Contribution' },
  { value: 'expense', label: 'Expense' },
  { value: 'dividend', label: 'Dividend' }
]

const EMPTY_FORM = { type: 'income', category: 'driver_rent', amount: '', txn_date: '', description: '', member_id: '', car_id: '' }

export default function Ledger() {
  const [month, setMonth] = useState(currentMonth())
  const [type, setType] = useState('')

  const base = `/api/transactions`
  const qs = new URLSearchParams()
  if (month) qs.set('month', month)
  if (type) qs.set('type', type)
  const { data, status, isDemo, error, refetch } = useApi(`${base}?${qs}`, {
    demo: () => {
      const all = demoTransactions(month)
      return { transactions: type ? all.filter((t) => t.type === type) : all }
    }
  })

  const membersApi = useApi('/api/members', { demo: demoMembers })
  const carsApi = useApi('/api/cars', { demo: demoCars })
  const members = membersApi.data?.members || []
  const cars = carsApi.data?.cars || []

  const [modal, setModal] = useState(null) // { mode: 'add' | 'edit', tx } | null
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (modal?.mode === 'edit' && modal.tx) {
      const tx = modal.tx
      setForm({
        type: tx.type,
        category: tx.category,
        amount: String(tx.amount),
        txn_date: tx.txnDate || tx.date || '',
        description: tx.description || '',
        member_id: tx.member_id != null ? String(tx.member_id) : '',
        car_id: tx.car_id != null ? String(tx.car_id) : ''
      })
      setFormError(null)
    } else if (modal?.mode === 'add') {
      setForm(EMPTY_FORM)
      setFormError(null)
    }
  }, [modal])

  const filtered = useMemo(() => data?.transactions || [], [data])

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    const payload = {
      type: form.type,
      category: form.category,
      amount: Number(form.amount),
      txn_date: form.txn_date,
      description: form.description || null,
      member_id: form.member_id ? Number(form.member_id) : null,
      car_id: form.car_id ? Number(form.car_id) : null
    }
    try {
      if (modal.mode === 'edit') {
        await apiRequest(`/api/transactions/${modal.tx.id}`, { method: 'PATCH', body: payload })
      } else {
        await apiRequest('/api/transactions', { method: 'POST', body: payload })
      }
      setModal(null)
      refetch()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setFormError(null)
    try {
      await apiRequest(`/api/transactions/${deleting.id}`, { method: 'DELETE' })
      setDeleting(null)
      refetch()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not delete entry.')
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tabular text-[10px] uppercase tracking-[0.22em] text-brass">Transactions</p>
          <h1 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Ledger</h1>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: 'add' })}
          className="rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all hover:bg-brass-light active:scale-[0.99]"
        >
          + Add entry
        </button>
      </div>

      {/* filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full rounded-md border border-rule bg-card/70 px-3 py-2 text-sm text-ink outline-none focus:border-brass sm:w-auto"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-md border border-rule bg-card/70 px-3 py-2 text-sm text-ink outline-none focus:border-brass sm:w-auto"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {isDemo && (
          <span className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11px] font-medium text-ink/70">
            Sample data
          </span>
        )}
      </div>

      {/* table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-rule bg-card/70">
        {status === 'loading' && !filtered.length ? (
          <p className="px-6 py-10 text-center text-sm text-ink/50">Loading entries…</p>
        ) : status === 'error' ? (
          <p className="px-6 py-10 text-center text-sm text-loss">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink/50">
            No entries for this filter — try another month, or add the first entry.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  {['Date', 'Description', 'Member / Car', 'Type', 'Amount', ''].map((h, i) => (
                    <th
                      key={i}
                      className="tabular whitespace-nowrap px-5 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-ink/40"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/60">
                {filtered.map((row) => {
                  const outflow = row.type === 'expense' || row.type === 'dividend'
                  const related = row.member_name || row.car_name || '—'
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-paper/70">
                      <td className="tabular whitespace-nowrap px-5 py-3 text-ink/60">
                        {row.txnDate || row.date}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{row.description || '—'}</p>
                        <p className="tabular text-xs text-ink/40">{row.category.replace(/_/g, ' ')}</p>
                      </td>
                      <td className="tabular whitespace-nowrap px-5 py-3 text-ink/60">{related}</td>
                      <td className="px-5 py-3">
                        <TypeChip type={row.type} />
                      </td>
                      <td
                        className={`tabular whitespace-nowrap px-5 py-3 text-right font-medium ${
                          outflow ? 'text-loss' : 'text-gain'
                        }`}
                      >
                        {outflow ? '−' : '+'}
                        {formatMoney(row.amount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={() => setModal({ mode: 'edit', tx: row })}
                          className="rounded-md p-2 text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={() => setDeleting(row)}
                          className="ml-1 rounded-md p-2 text-ink/40 transition-colors hover:bg-loss/10 hover:text-loss"
                        >
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* add / edit modal */}
      {modal && (
        <Modal
          title={modal.mode === 'edit' ? 'Edit entry' : 'Add entry'}
          onClose={() => setModal(null)}
          wide
        >
          <form onSubmit={handleSave} className="space-y-4">
            <ErrorBanner message={formError} />
            {isDemo && (
              <p className="rounded-md border border-brass/30 bg-brass/10 px-3 py-2 text-xs text-ink/70">
                Sample data is showing — changes can't be saved until the database is connected.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Type"
                id="tx-type"
                value={form.type}
                onChange={(v) => setForm((f) => ({ ...f, type: v, category: CATEGORIES_BY_TYPE[v][0].value }))}
                options={Object.keys(CATEGORIES_BY_TYPE).map((t) => ({ value: t, label: t }))}
              />
              <SelectField
                label="Category"
                id="tx-category"
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                options={CATEGORIES_BY_TYPE[form.type]}
              />
              <Field
                label="Amount"
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                required
              />
              <Field
                label="Date"
                id="tx-date"
                type="date"
                value={form.txn_date}
                onChange={(v) => setForm((f) => ({ ...f, txn_date: v }))}
                required
              />
              {(form.type === 'contribution' || form.type === 'dividend') && (
                <SelectField
                  label="Member"
                  id="tx-member"
                  value={form.member_id}
                  onChange={(v) => setForm((f) => ({ ...f, member_id: v }))}
                  options={[{ value: '', label: '—' }, ...members.map((m) => ({ value: String(m.id), label: m.name }))]}
                />
              )}
              {(form.type === 'income' || form.type === 'expense') && (
                <SelectField
                  label="Car"
                  id="tx-car"
                  value={form.car_id}
                  onChange={(v) => setForm((f) => ({ ...f, car_id: v }))}
                  options={[{ value: '', label: '—' }, ...cars.map((c) => ({ value: String(c.id), label: c.name }))]}
                />
              )}
            </div>
            <Field
              label="Description"
              id="tx-desc"
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Optional note"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-md border border-rule bg-card/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-navy transition-all hover:bg-brass-light disabled:opacity-60"
              >
                {busy ? 'Saving…' : modal.mode === 'edit' ? 'Save changes' : 'Add entry'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* delete confirm */}
      {deleting && (
        <Modal title="Delete entry" onClose={() => setDeleting(null)}>
          <p className="text-sm text-ink/70">
            Delete <span className="font-medium text-ink">{deleting.description || 'this entry'}</span>{' '}
            ({formatMoney(deleting.amount)})? This can't be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-md border border-rule bg-card/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-md bg-loss px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </svg>
  )
}
