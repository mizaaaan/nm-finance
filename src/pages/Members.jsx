import { useState } from 'react'
import AppShell from '../components/AppShell'
import Modal from '../components/Modal'
import { Field, SelectField, ErrorBanner } from '../components/Field'
import { useAuth } from '../context/AuthContext'
import { useApi } from '../hooks/useApi'
import { apiRequest } from '../lib/api'
import { demoMembers } from '../lib/demoData'

const EMPTY_FORM = { name: '', email: '', phone: '', role: 'member' }

export default function Members() {
  const { isAdmin } = useAuth()
  const { data, status, isDemo, error, refetch } = useApi('/api/members', { demo: demoMembers })
  const members = data?.members || []

  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [listError, setListError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  async function handleCreate(e) {
    e.preventDefault()
    setBusy(true)
    setFormError(null)
    try {
      await apiRequest('/api/members', { method: 'POST', body: { ...form, email: form.email || null } })
      setModalOpen(false)
      setForm(EMPTY_FORM)
      refetch()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setListError(null)
    try {
      await apiRequest(`/api/members/${deleting.id}`, { method: 'DELETE' })
      setDeleting(null)
      refetch()
    } catch (err) {
      setListError(err.message)
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tabular text-[10px] uppercase tracking-[0.22em] text-brass">People</p>
          <h1 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Members</h1>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM)
              setFormError(null)
              setModalOpen(true)
            }}
            className="rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all hover:bg-brass-light active:scale-[0.99]"
          >
            + Add member
          </button>
        )}
      </div>

      {(isDemo || listError) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isDemo && (
            <span className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11px] font-medium text-ink/70">
              Sample data
            </span>
          )}
          {listError && (
            <span className="rounded-md border-l-2 border-loss bg-loss/5 px-3 py-1.5 text-xs text-loss">
              {listError}
            </span>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {status === 'loading' && !members.length ? (
          <p className="col-span-full text-center text-sm text-ink/50">Loading members…</p>
        ) : status === 'error' ? (
          <p className="col-span-full text-center text-sm text-loss">{error}</p>
        ) : members.length === 0 ? (
          <p className="col-span-full text-center text-sm text-ink/50">
            No members yet — add the first one.
          </p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-rule bg-card/70 p-5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(15,31,61,0.3)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass/15 text-sm font-semibold text-brass">
                    {m.name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-ink">{m.name}</h3>
                    <p className="tabular truncate text-xs text-ink/45">{m.email || 'No email'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={`Delete ${m.name}`}
                    onClick={() => setDeleting(m)}
                    className="rounded-md p-2 text-ink/30 transition-colors hover:bg-loss/10 hover:text-loss"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3 text-sm">
                {m.role === 'admin' && (
                  <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brass">
                    Admin
                  </span>
                )}
                <span className="text-ink/60">{m.phone || '—'}</span>
              </div>
              <p className="tabular mt-3 text-xs text-ink/40">
                Joined {m.joined_date || '—'}
              </p>
            </div>
          ))
        )}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-ink/40">
        Sign-in accounts are managed separately via Netlify Identity. Members here are the group's
        ledger participants — contributions and dividends are recorded against them.
      </p>

      {/* add modal */}
      {modalOpen && (
        <Modal title="Add member" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <ErrorBanner message={formError} />
            {isDemo && (
              <p className="rounded-md border border-brass/30 bg-brass/10 px-3 py-2 text-xs text-ink/70">
                Sample data is showing — changes can't be saved until the database is connected.
              </p>
            )}
            <Field label="Name" id="m-name" value={form.name} onChange={set('name')} required />
            <Field label="Email" id="m-email" type="email" value={form.email} onChange={set('email')} />
            <Field label="Phone" id="m-phone" value={form.phone} onChange={set('phone')} placeholder="e.g. 0803 123 4567" />
            <SelectField
              label="Role"
              id="m-role"
              value={form.role}
              onChange={set('role')}
              options={[
                { value: 'member', label: 'Member' },
                { value: 'admin', label: 'Admin' }
              ]}
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-rule bg-card/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-brass px-4 py-2.5 text-sm font-semibold text-navy transition-all hover:bg-brass-light disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Add member'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* delete confirm */}
      {deleting && (
        <Modal title="Delete member" onClose={() => setDeleting(null)}>
          <p className="text-sm text-ink/70">
            Delete <span className="font-medium text-ink">{deleting.name}</span>? Their transaction
            history stays but is no longer linked.
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
