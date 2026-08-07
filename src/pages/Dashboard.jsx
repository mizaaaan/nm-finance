import { useState } from 'react'
import AppShell from '../components/AppShell'
import Modal from '../components/Modal'
import StatCards from '../components/dashboard/StatCards'
import TrendChart from '../components/dashboard/TrendChart'
import MemberGrid from '../components/dashboard/MemberGrid'
import RecentTable from '../components/dashboard/RecentTable'
import { useAuth } from '../context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { apiRequest } from '../lib/api'
import { currentMonth, monthLabel, shiftMonth } from '../lib/format'

export default function Dashboard() {
  const { isAdmin } = useAuth()
  const today = currentMonth()
  const [month, setMonth] = useState(today)
  const { data, status, isDemo, error, refetch } = useDashboard(month)
  const [initState, setInitState] = useState(null) // null | 'running' | 'done' | 'failed'
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetBusy, setResetBusy] = useState(false)
  const [resetError, setResetError] = useState(null)
  const [resetDone, setResetDone] = useState(false)

  async function handleReset() {
    setResetBusy(true)
    setResetError(null)
    try {
      await apiRequest('/api/reset', { method: 'POST' })
      setResetOpen(false)
      setResetConfirm('')
      setResetDone(true)
      refetch()
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetBusy(false)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tabular text-[10px] uppercase tracking-[0.22em] text-brass">
            Company overview
          </p>
          <h1 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDemo && (
            <span className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11px] font-medium text-ink/70">
              Offline · connect the database for live figures
            </span>
          )}
          <div className="flex items-center rounded-md border border-rule bg-card/70">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="px-3 py-2 text-ink/50 transition-colors hover:text-ink"
            >
              ‹
            </button>
            <span className="tabular min-w-[8.5rem] text-center text-sm font-medium text-ink">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={month >= today}
              className="px-3 py-2 text-ink/50 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {status === 'error' ? (
        <div className="mt-6 rounded-xl border border-loss/30 bg-loss/5 px-5 py-6 text-center">
          <p className="font-display text-xl text-ink">Couldn't load the dashboard</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">{error}</p>
          {isAdmin && (
            <button
              type="button"
              disabled={initState === 'running'}
              onClick={async () => {
                setInitState('running')
                try {
                  await apiRequest('/api/init', { method: 'POST' })
                  setInitState('done')
                  refetch()
                } catch {
                  setInitState('failed')
                }
              }}
              className="mt-5 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-light disabled:opacity-60"
            >
              {initState === 'running'
                ? 'Setting up…'
                : initState === 'done'
                  ? 'Done — reloading…'
                  : 'Run database setup'}
            </button>
          )}
          {initState === 'failed' && (
            <p className="mt-2 text-xs text-loss">Setup failed — check the function logs.</p>
          )}
        </div>
      ) : status === 'loading' || !data ? (
        <div className="mt-6 space-y-6" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-rule bg-card/50 p-5">
                <div className="h-3 w-24 rounded bg-ink/10" />
                <div className="mt-4 h-8 w-36 rounded bg-ink/10" />
                <div className="mt-3 h-3 w-28 rounded bg-ink/5" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-xl border border-rule bg-card/50 p-5">
            <div className="h-4 w-40 rounded bg-ink/10" />
            <div className="mt-6 h-52 rounded bg-ink/5" />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <StatCards data={data} />
          </div>
          <TrendChart data={data} month={month} />
          <MemberGrid members={data.members} />
          <RecentTable rows={data.recent} />
        </>
      )}

      {/* danger zone — wipe everything and start fresh for the company */}
      {isAdmin && (
        <section className="mt-12 rounded-xl border border-loss/25 bg-loss/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="tabular text-[10px] uppercase tracking-[0.2em] text-loss">
                Danger zone
              </p>
              <h2 className="font-display mt-1 text-lg text-ink">Reset company data</h2>
              <p className="mt-1 max-w-lg text-sm text-ink/55">
                Permanently deletes every member, car, and transaction so you can start
                from a clean slate. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setResetConfirm('')
                setResetError(null)
                setResetDone(false)
                setResetOpen(true)
              }}
              className="rounded-md border border-loss/40 bg-card/70 px-4 py-2.5 text-sm font-semibold text-loss transition-all hover:bg-loss hover:text-white"
            >
              Reset all data
            </button>
          </div>
          {resetDone && !resetOpen && (
            <p className="mt-3 rounded-md border-l-2 border-gain bg-gain/5 px-3 py-2 text-sm text-gain">
              All data has been wiped. The company ledger now starts empty.
            </p>
          )}
        </section>
      )}

      {/* reset confirmation */}
      {resetOpen && (
        <Modal title="Reset all company data?" onClose={() => setResetOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ink/70">
              This <span className="font-medium text-loss">permanently deletes</span> every
              member, car, and transaction from the database. This is not reversible — the
              ledger will start completely empty.
            </p>
            {resetError && (
              <div role="alert" className="rounded-md border-l-2 border-loss bg-loss/5 px-3 py-2.5 text-sm text-loss">
                {resetError}
              </div>
            )}
            <label htmlFor="reset-confirm" className="block">
              <span className="tabular block text-[11px] uppercase tracking-[0.16em] text-ink/50">
                Type <span className="font-semibold text-loss">RESET</span> to confirm
              </span>
              <input
                id="reset-confirm"
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                autoComplete="off"
                placeholder="RESET"
                className="mt-1.5 w-full rounded-md border border-rule bg-card/70 px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/25 focus:border-loss"
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="rounded-md border border-rule bg-card/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetConfirm !== 'RESET' || resetBusy}
                onClick={handleReset}
                className="rounded-md bg-loss px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetBusy ? 'Deleting everything…' : 'Delete all data'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
