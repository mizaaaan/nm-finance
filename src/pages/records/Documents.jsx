import { Link } from 'react-router-dom'
import AppShell from '../../components/AppShell'
import { COMPANY, CONTRIBUTORS, DIRECTORS_TOTAL, DIVIDEND_RUNS, DOCUMENTS, VEHICLES } from '../../data/records'
import { formatAmount, formatProfit } from '../../lib/format'

export default function Documents() {
  const paid = DIVIDEND_RUNS.reduce(
    (sum, run) => sum + run.entries.reduce((s, e) => s + e.shares * run.rate, 0),
    0
  )

  const figures = [
    { label: 'Members on the register', value: String(CONTRIBUTORS.length) },
    { label: 'Vehicles in the fleet', value: String(VEHICLES.length) },
    { label: 'Directors’ commitment', value: formatAmount(DIRECTORS_TOTAL.invested) },
    { label: 'Dividends paid in 2026', value: formatAmount(paid) }
  ]

  return (
    <AppShell>
      <header className="max-w-2xl">
        <p className="tabular text-[11px] font-semibold uppercase tracking-[0.06em] text-brass">
          Records · {COMPANY.period}
        </p>
        <h1 className="font-display mt-1 text-3xl text-ink sm:text-4xl">All documents</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          Every 2026 workbook, opened up for reading. Pick a document to see it line by
          line — the same figures the treasurer works from.
        </p>
      </header>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-4">
        {figures.map((f, i) => (
          <div key={f.label} className="bg-navy px-5 py-4">
            <dt className="text-[11px] leading-tight text-white/55">{f.label}</dt>
            <dd
              className={`tabular mt-2 text-xl font-medium tracking-tight sm:text-2xl ${
                i === 0 ? 'text-brass-light' : 'text-white'
              }`}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] leading-relaxed text-ink/40">
        Figures in UAE dirhams (AED), taken from the workbooks as at {COMPANY.asOf}.
      </p>

      <nav aria-label="Documents" className="mt-10">
        <div className="flex items-baseline justify-between border-b-2 border-ink/80 pb-2">
          <h2 className="font-display text-lg text-ink">2026 workbooks</h2>
          <p className="tabular text-[11px] text-ink/40">{DOCUMENTS.length} documents</p>
        </div>

        <ul className="divide-y divide-rule">
          {DOCUMENTS.map((doc) => (
            <li key={doc.id}>
              <Link
                to={doc.path}
                className="group grid gap-3 py-5 transition-colors hover:bg-brass/[0.06] sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-xl text-ink transition-colors group-hover:text-ink-light">
                      {doc.title}
                    </h3>
                    <span className="text-[11px] text-ink/40">{doc.kind}</span>
                  </div>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink/55">{doc.summary}</p>
                </div>

                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <div className="flex gap-6">
                    {doc.figures.map((f) => (
                      <div key={f.label}>
                        <p className="tabular text-[11px] text-ink/40">{f.label}</p>
                        <p className="tabular mt-0.5 text-base font-medium text-ink">
                          {f.decimals ? formatProfit(f.value) : formatAmount(f.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-ink/25 transition-colors group-hover:text-brass"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </AppShell>
  )
}
