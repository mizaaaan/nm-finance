import AppShell from '../../components/AppShell'
import DocumentHeader from '../../components/records/DocumentHeader'
import RegisterTable from '../../components/records/RegisterTable'
import SourceNote from '../../components/records/SourceNote'
import { DIRECTOR_PROFIT, PROFIT_MONTHS } from '../../data/records'
import { formatAmount, formatExact, formatProfit } from '../../lib/format'

export default function DirectorPnl() {
  const rows = DIRECTOR_PROFIT.map((m, i) => {
    const profitTotal = m.profit.reduce((sum, v) => sum + v, 0)
    return {
      ...m,
      id: m.name,
      sl: i + 1,
      profitTotal,
      holding: m.invested + profitTotal
    }
  })

  const invested = rows.reduce((sum, r) => sum + r.invested, 0)
  const profit = rows.reduce((sum, r) => sum + r.profitTotal, 0)
  const holding = invested + profit
  const monthTotals = PROFIT_MONTHS.map((_, idx) =>
    rows.reduce((sum, r) => sum + r.profit[idx], 0)
  )

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
      key: 'invested',
      label: 'Invested',
      align: 'right',
      render: (row) => formatAmount(row.invested)
    },
    ...PROFIT_MONTHS.map((month, idx) => ({
      key: month,
      label: month,
      align: 'right',
      secondary: true,
      render: (row) =>
        row.profit[idx] ? (
          <span className="text-ink/75">{formatProfit(row.profit[idx])}</span>
        ) : (
          <span className="text-ink/25">—</span>
        )
    })),
    {
      key: 'holding',
      label: 'Holding',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-ink">{formatProfit(row.holding)}</span>
      )
    }
  ]

  return (
    <AppShell>
      <DocumentHeader
        id="director-pnl"
        lede="Profit allocated to each participant from April to July 2026, month by month. A holding is a member’s investment plus the profit credited to it."
        figures={[
          { label: 'Profit Apr–Jul (AED)', value: formatProfit(profit) },
          { label: 'Invested', value: formatAmount(invested) },
          { label: 'Holding value', value: formatProfit(holding) },
          { label: 'Participants', value: String(rows.length) }
        ]}
        meta="Profit per month rose from 1,817.70 in April to 8,711.01 in July as more cars went on rent."
      />

      <section className="mt-8">
        <RegisterTable
          columns={columns}
          rows={rows}
          search={{ placeholder: 'Search members…', keys: ['name'] }}
          footer={{
            name: 'Total',
            invested: formatAmount(invested),
            ...Object.fromEntries(PROFIT_MONTHS.map((m, i) => [m, formatProfit(monthTotals[i])])),
            holding: formatProfit(holding)
          }}
          caption="A dash means no profit was allocated to that member in that month."
          minWidth="sm:min-w-[50rem]"
        />
      </section>

      <SourceNote file="Director Profit & Loss Accounts- 2026.xlsx">
        The workbook’s own Total column equals investment plus accumulated profit — that
        is the Holding column here, computed from the monthly lines. {formatExact(profit)}{' '}
        of profit was allocated across {PROFIT_MONTHS.length} months; May and June include
        members who joined mid-period.
      </SourceNote>
    </AppShell>
  )
}
