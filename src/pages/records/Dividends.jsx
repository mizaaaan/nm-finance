import { useState } from 'react'
import AppShell from '../../components/AppShell'
import DocumentHeader from '../../components/records/DocumentHeader'
import RegisterTable from '../../components/records/RegisterTable'
import SourceNote from '../../components/records/SourceNote'
import { DIVIDEND_BD, DIVIDEND_RUNS } from '../../data/records'
import { formatAmount } from '../../lib/format'

const totalOf = (run) => run.entries.reduce((sum, e) => sum + e.shares * run.rate, 0)
const sharesOf = (run) => run.entries.reduce((sum, e) => sum + e.shares, 0)

export default function Dividends() {
  const [active, setActive] = useState(DIVIDEND_RUNS[DIVIDEND_RUNS.length - 1].id)
  const run = DIVIDEND_RUNS.find((r) => r.id === active)
  const paidAll = DIVIDEND_RUNS.reduce((sum, r) => sum + totalOf(r), 0)
  const largest = DIVIDEND_RUNS.reduce((a, b) => (a.entries.length >= b.entries.length ? a : b))

  const rows = run.entries.map((e, i) => ({
    ...e,
    id: `${run.id}-${e.name}`,
    sl: i + 1,
    amount: e.shares * run.rate
  }))

  const columns = [
    {
      key: 'sl',
      label: '#',
      className: 'w-10 text-ink/35',
      render: (row) => <span className="tabular text-xs">{row.sl}</span>
    },
    {
      key: 'name',
      label: 'Member',
      render: (row) => <span className="font-medium text-ink">{row.name}</span>
    },
    {
      key: 'shares',
      label: 'Shares',
      align: 'right'
    },
    {
      key: 'amount',
      label: 'Amount (AED)',
      align: 'right',
      render: (row) => formatAmount(row.amount)
    }
  ]

  return (
    <AppShell>
      <DocumentHeader
        id="dividends"
        lede="Three distributions in 2026, each paid at 100 per share. Choose a run to see every member and the shares they were paid on."
        figures={[
          { label: 'Distributed in 2026 (AED)', value: formatAmount(paidAll) },
          { label: 'Per share', value: formatAmount(100) },
          { label: 'Runs', value: String(DIVIDEND_RUNS.length) },
          { label: 'Largest run', value: `${largest.entries.length} members` }
        ]}
        meta="Share counts follow the register for each run; a member paid twice holds two shares."
      />

      <section className="mt-8">
        <div
          role="tablist"
          aria-label="Dividend runs"
          className="flex flex-wrap gap-1 border-b border-rule"
        >
          {DIVIDEND_RUNS.map((r) => {
            const on = r.id === active
            return (
              <button
                key={r.id}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => setActive(r.id)}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  on
                    ? 'border-brass text-ink'
                    : 'border-transparent text-ink/45 hover:text-ink/75'
                }`}
              >
                {r.date}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-ink">{run.label}</h2>
          <p className="tabular text-sm text-ink/55">
            {sharesOf(run)} shares · {formatAmount(totalOf(run))} AED at {formatAmount(run.rate)}{' '}
            per share
          </p>
        </div>

        <div className="mt-3">
          <RegisterTable
            columns={columns}
            rows={rows}
            search={{ placeholder: 'Search this run…', keys: ['name'] }}
            footer={{
              name: `Total · ${run.entries.length} members`,
              shares: sharesOf(run),
              amount: formatAmount(totalOf(run))
            }}
            minWidth="sm:min-w-[24rem]"
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display border-b-2 border-ink/80 pb-2 text-lg text-ink">
          Settled in Bangladesh
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/55">
          Two runs were also paid out in taka, at the rate the treasurer used for that
          settlement. These are the same dividends, not additional ones.
        </p>
        <div className="mt-3">
          <RegisterTable
            columns={[
              { key: 'run', label: 'Run' },
              {
                key: 'rate',
                label: 'Taka per share',
                align: 'right',
                render: (row) => formatAmount(row.rate)
              },
              { key: 'shares', label: 'Shares', align: 'right' },
              {
                key: 'total',
                label: 'Total (BDT)',
                align: 'right',
                render: (row) => formatAmount(row.total)
              }
            ]}
            rows={DIVIDEND_BD}
            rowKey="run"
            caption="Converted at the rate recorded against each settlement."
            minWidth="sm:min-w-[26rem]"
          />
        </div>
      </section>

      <SourceNote file="Divident.xlsx">
        Each run is a separate sheet in the workbook, each with a signature column kept
        blank until the member collects. Amounts are shares multiplied by the run’s rate;
        the sheet totals agree with that arithmetic.
      </SourceNote>
    </AppShell>
  )
}
