import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatMoney, formatCompact, shortMonth, monthLabel } from '../../lib/format'

export default function TrendChart({ data, month }) {
  const { monthly, cars } = data
  const gradientId = useId().replace(/:/g, '')
  const inId = `gradIn-${gradientId}`
  const outId = `gradOut-${gradientId}`
  const breakdown = [
    { label: 'Rent income', value: monthly.income, tone: 'gain' },
    { label: 'Contributions', value: monthly.contributions, tone: 'gain' },
    { label: 'Expenses', value: monthly.expenses, tone: 'loss' },
    { label: 'Dividends paid', value: monthly.dividends, tone: 'loss' }
  ]
  const carStatus = { active: 0, in_repair: 0, sold: 0 }
  ;(cars || []).forEach((c) => {
    carStatus[c.status] = c.count
  })

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* trend chart */}
      <div className="rounded-xl border border-rule bg-white/70 p-5 lg:col-span-2">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="tabular text-[10px] uppercase tracking-[0.2em] text-ink/45">
              Cash flow · last 6 months
            </p>
            <h3 className="font-display mt-1 text-xl text-ink">{monthLabel(month)}</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink/55">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brass" /> In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink" /> Out
            </span>
          </div>
        </div>

        <div className="mt-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={inId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={outId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F1F3D" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0F1F3D" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#DCD7C9" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={shortMonth}
                tick={{ fill: '#0F1F3D', fontSize: 11, opacity: 0.55 }}
                axisLine={{ stroke: '#DCD7C9' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCompact(v)}
                tick={{ fill: '#0F1F3D', fontSize: 11, opacity: 0.55 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatMoney(value),
                  name === 'inflow' ? 'Money in' : 'Money out'
                ]}
                labelFormatter={(label) => monthLabel(label)}
                contentStyle={{
                  background: '#F7F5F0',
                  border: '1px solid #DCD7C9',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace"
                }}
              />
              <Area
                type="monotone"
                dataKey="inflow"
                stroke="#C9A227"
                strokeWidth={2}
                fill={`url(#${inId})`}
              />
              <Area
                type="monotone"
                dataKey="outflow"
                stroke="#0F1F3D"
                strokeWidth={2}
                fill={`url(#${outId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* this month breakdown + cars */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-rule bg-white/70 p-5">
          <p className="tabular text-[10px] uppercase tracking-[0.2em] text-ink/45">
            This month · breakdown
          </p>
          <ul className="mt-4 space-y-3">
            {breakdown.map((row) => (
              <li key={row.label} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink/60">{row.label}</span>
                <span
                  className={`tabular text-sm font-medium ${
                    row.tone === 'gain' ? 'text-gain' : 'text-loss'
                  }`}
                >
                  {row.tone === 'gain' ? '' : '−'}
                  {formatMoney(row.value)}
                </span>
              </li>
            ))}
            <li className="flex items-baseline justify-between gap-3 border-t border-rule pt-3">
              <span className="text-sm font-medium text-ink/70">Net for the month</span>
              <span
                className={`tabular text-base font-semibold ${
                  monthly.net >= 0 ? 'text-gain' : 'text-loss'
                }`}
              >
                {monthly.net >= 0 ? '' : '−'}
                {formatMoney(Math.abs(monthly.net))}
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-rule bg-white/70 p-5">
          <p className="tabular text-[10px] uppercase tracking-[0.2em] text-ink/45">Fleet</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['Active', carStatus.active, 'text-gain'],
              ['In repair', carStatus.in_repair, 'text-loss'],
              ['Sold', carStatus.sold, 'text-ink/45']
            ].map(([label, count, tone]) => (
              <span
                key={label}
                className="flex items-center gap-2 rounded-full border border-rule bg-paper px-3 py-1.5 text-xs text-ink/60"
              >
                <span className={`h-1.5 w-1.5 rounded-full bg-current ${tone}`} />
                {label}
                <span className="tabular font-semibold text-ink">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
