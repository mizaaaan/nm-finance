import { useState } from 'react'
import AppShell from '../components/AppShell'
import Modal from '../components/Modal'
import { Field, SelectField, ErrorBanner } from '../components/Field'
import { useApi } from '../hooks/useApi'
import { apiRequest } from '../lib/api'
import { formatMoney } from '../lib/format'
import { demoCars } from '../lib/demoData'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'in_repair', label: 'In repair' },
  { value: 'sold', label: 'Sold' }
]

const STATUS_STYLE = {
  active: 'bg-gain/10 text-gain',
  in_repair: 'bg-loss/10 text-loss',
  sold: 'bg-ink/10 text-ink/60'
}

const EMPTY_FORM = { name: '', registration_no: '', purchase_price: '', purchase_date: '', status: 'active' }

export default function Cars() {
  const { data, status, isDemo, error, refetch } = useApi('/api/cars', { demo: demoCars })
  const cars = data?.cars || []

  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  async function handleCreate(e) {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    try {
      await apiRequest('/api/cars', {
        method: 'POST',
        body: {
          name: form.name,
          registration_no: form.registration_no || null,
          purchase_price: form.purchase_price ? Number(form.purchase_price) : 0,
          purchase_date: form.purchase_date || null,
          status: form.status
        }
      })
      setModalOpen(false)
      setForm(EMPTY_FORM)
      refetch()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleStatusChange(car, status) {
    try {
      await apiRequest(`/api/cars/${car.id}`, { method: 'PATCH', body: { status } })
      refetch()
    } catch (err) {
      // Non-critical; keep old value visually via refetch failure being silent
      console.error('Status update failed:', err.message)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setFormError(null)
    try {
      await apiRequest(`/api/cars/${deleting.id}`, { method: 'DELETE' })
      setDeleting(null)
      refetch()
    } catch (err) {
      setFormError(err.message)
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tabular text-[10px] uppercase tracking-[0.22em] text-brass">Fleet</p>
          <h1 className="font-display mt-1 text-3xl text-ink">Cars</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM)
            setFormError(null)
            setModalOpen(true)
          }}
          className="rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition-all hover:bg-brass-light active:scale-[0.99]"
        >
          + Add car
        </button>
      </div>

      {isDemo && (
        <div className="mt-4">
          <span className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11px] font-medium text-ink/70">
            Sample data
          </span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {status === 'loading' && !cars.length ? (
          <p className="col-span-full text-center text-sm text-ink/50">Loading cars…</p>
        ) : status === 'error' ? (
          <p className="col-span-full text-center text-sm text-loss">{error}</p>
        ) : cars.length === 0 ? (
          <p className="col-span-full text-center text-sm text-ink/50">No cars yet — add the first one.</p>
        ) : (
          cars.map((car) => (
            <div
              key={car.id}
              className="rounded-xl border border-rule bg-white/70 p-5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(15,31,61,0.3)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-ink">{car.name}</h3>
                  <p className="tabular mt-0.5 text-xs text-ink/45">{car.registration_no || 'No registration'}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${car.name}`}
                  onClick={() => setDeleting(car)}
                  className="rounded-md p-1.5 text-ink/30 transition-colors hover:bg-loss/10 hover:text-loss"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="tabular text-[10px] uppercase tracking-[0.16em] text-ink/45">Purchased</p>
                  <p className="tabular mt-1 text-sm font-medium text-ink">
                    {formatMoney(car.purchase_price)}
                  </p>
                  <p className="tabular text-xs text-ink/40">{car.purchase_date || '—'}</p>
                </div>
                <div>
                  <p className="tabular text-[10px] uppercase tracking-[0.16em] text-ink/45">Status</p>
                  <select
                    aria-label={`Status of ${car.name}`}
                    value={car.status}
                    onChange={(e) => handleStatusChange(car, e.target.value)}
                    className={`mt-1 rounded-full border-0 bg-transparent px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-brass/40 ${
                      STATUS_STYLE[car.status] || 'bg-ink/5 text-ink/60'
                    }`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* add modal */}
      {modalOpen && (
        <Modal title="Add car" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <ErrorBanner message={formError} />
            {isDemo && (
              <p className="rounded-md border border-brass/30 bg-brass/10 px-3 py-2 text-xs text-ink/70">
                Sample data is showing — changes can't be saved until the database is connected.
              </p>
            )}
            <Field label="Name" id="c-name" value={form.name} onChange={set('name')} placeholder="e.g. Toyota Camry — Silver" required />
            <Field label="Registration no." id="c-reg" value={form.registration_no} onChange={set('registration_no')} placeholder="e.g. LAG 123 XYZ" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Purchase price" id="c-price" type="number" step="0.01" min="0" value={form.purchase_price} onChange={set('purchase_price')} />
              <Field label="Purchase date" id="c-date" type="date" value={form.purchase_date} onChange={set('purchase_date')} />
            </div>
            <SelectField label="Status" id="c-status" value={form.status} onChange={set('status')} options={STATUS_OPTIONS} />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-rule bg-white/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-ink transition-all hover:bg-brass-light disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Add car'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* delete confirm */}
      {deleting && (
        <Modal title="Delete car" onClose={() => setDeleting(null)}>
          <p className="text-sm text-ink/70">
            Delete <span className="font-medium text-ink">{deleting.name}</span>? Transactions
            linked to it stay but the link is removed.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="rounded-md border border-rule bg-white/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-md bg-loss px-4 py-2.5 text-sm font-semibold text-paper transition-all hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
