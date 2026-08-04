import { formatMoney, formatCompact } from '../../lib/format'

export default function StatCards({ data }) {
  const { balance, monthly } = data
  const prevMonthMonthly = data.trend[data.trend.length - 2]
  const prevNet = prevMonthMonthly ? prevMonthMonthly.inflow - prevMonthMonthly.outflow : null
  const delta = prevNet === null || prevNet === 0 ? null : ((monthly.net - prevNet) / Math.abs(prevNet)) * 100

  const cards = [
    {
      label: 'Company balance',
      value: balance.net,
      sub: `In ${formatCompact(balance.inflow)} · Out ${formatCompact(balance.outflow)}`,
      accent: true
    },
    {
      label: 'Net · this month',
      value: monthly.net,
      sub: delta === null ? 'vs previous month' : `vs previous month ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
      positive: (monthly.net ?? 0) >= 0
    },
    {
      label: 'Income · this month',
      value: monthly.income + monthly.contributions,
      sub: `Rent ${formatCompact(monthly.income)} + contributions ${formatCompact(monthly.contributions)}`
    },
    {
      label: 'Expenses · this month',
      value: monthly.expenses,
      sub: `Dividends paid ${formatCompact(monthly.dividends)}`,
      positive: false
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-rule bg-white/70 p-5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(15,31,61,0.3)]"
        >
          <p className="tabular text-[10px] uppercase tracking-[0.2em] text-ink/45">{card.label}</p>
          <p
            className={`mt-3 tabular text-3xl font-medium tracking-tight ${
              card.accent ? 'text-brass' : 'text-ink'
            }`}
          >
            {formatMoney(card.value)}
          </p>
          <p
            className={`tabular mt-2 text-xs ${
              card.positive === undefined ? 'text-ink/40' : card.positive ? 'text-gain' : 'text-loss'
            }`}
          >
            {card.sub}
          </p>
        </div>
      ))}
    </div>
  )
}
