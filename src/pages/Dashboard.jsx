import { useState } from 'react'
import AppShell from '../components/AppShell'
import StatCards from '../components/dashboard/StatCards'
import TrendChart from '../components/dashboard/TrendChart'
import MemberGrid from '../components/dashboard/MemberGrid'
import RecentTable from '../components/dashboard/RecentTable'
import { useDashboard } from '../hooks/useDashboard'
import { apiRequest } from '../lib/api'
import { currentMonth, monthLabel, shiftMonth } from '../lib/format'

export default function Dashboard() {
  const today = currentMonth()
  const [month, setMonth] = useState(today)
  const { data, status, isDemo, error, refetch } = useDashboard(month)
  const [initState, setInitState] = useState(null) // null | 'running' | 'done' | 'failed'

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tabular text-[10px] uppercase tracking-[0.22em] text-brass">
            Company overview
          </p>
          <h1 className="font-display mt-1 text-3xl text-ink">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11px] font-medium text-ink/70">
              Sample data · connect Netlify DB for live figures
            </span>
          )}
          <div className="flex items-center rounded-md border border-rule bg-white/70">
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
            className="mt-5 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-all hover:bg-ink-light disabled:opacity-60"
          >
            {initState === 'running'
              ? 'Setting up…'
              : initState === 'done'
                ? 'Done — reloading…'
                : 'Run database setup'}
          </button>
          {initState === 'failed' && (
            <p className="mt-2 text-xs text-loss">Setup failed — check the function logs.</p>
          )}
        </div>
      ) : status === 'loading' || !data ? (
        <div className="mt-6 space-y-6" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-rule bg-white/50 p-5">
                <div className="h-3 w-24 rounded bg-ink/10" />
                <div className="mt-4 h-8 w-36 rounded bg-ink/10" />
                <div className="mt-3 h-3 w-28 rounded bg-ink/5" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-xl border border-rule bg-white/50 p-5">
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
    </AppShell>
  )
}
