import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import AppShell from '../../components/AppShell'
import DocumentHeader from '../../components/records/DocumentHeader'
import RegisterTable from '../../components/records/RegisterTable'
import SourceNote from '../../components/records/SourceNote'
import { useTheme } from '../../context/ThemeContext'
import {
  CAR_PERFORMANCE,
  CONTRIBUTORS,
  CONTRIBUTORS_TOTAL,
  MONTHS,
  VEHICLES,
  YEAR_TO_DATE
} from '../../data/records'
import { formatAmount, formatCompact } from '../../lib/format'

function Section({ id, title, description, trailing, children }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink/80 pb-2">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {trailing && <p className="tabular text-[11px] text-ink/40">{trailing}</p>}
      </div>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/55">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const dash = (value) => (value ? formatAmount(value) : <span className="text-ink/25">—</span>)

export default function MonthlyAccounts() {
  const { isDark } = useTheme()
  const close = MONTHS[MONTHS.length - 1]
  const fleetCost = VEHICLES.reduce((sum, v) => sum + v.rate, 0)

  const monthRows = MONTHS.map((m, i) => ({
    ...m,
    id: m.month,
    movement: i === 0 ? null : m.cash - MONTHS[i - 1].cash
  }))

  const contributorRows = CONTRIBUTORS.map((c, i) => ({
    ...c,
    id: `${c.name}-${i}`,
    sl: i + 1,
    total: c.amount + c.alJaloui
  }))

  const carRows = CAR_PERFORMANCE.map((c) => {
    const income = c.income.reduce((sum, r) => sum + r.amount, 0)
    const expenses = c.expenses.reduce((sum, r) => sum + r.amount, 0)
    return { id: c.car, ...c, incomeTotal: income, expenseTotal: expenses, balance: income - expenses }
  })

  const chart = {
    ink: isDark ? '#e7e7e7' : '#1a1a1a',
    brass: '#54C2FE',
    grid: isDark ? '#262930' : '#e0e0e0',
    tooltipBg: isDark ? '#16191e' : '#ffffff',
    tooltipBorder: isDark ? '#262930' : '#e0e0e0'
  }

  return (
    <AppShell>
      <DocumentHeader
        id="months"
        lede="The company’s month-by-month balance sheets for 2026, the member contribution list, the fleet it bought, and what each car earned against what it cost."
        figures={[
          { label: 'Cash in hand · Nov (AED)', value: formatAmount(close.cash) },
          { label: 'Fleet cost', value: formatAmount(fleetCost) },
          { label: 'Member collections to July', value: formatAmount(YEAR_TO_DATE.memberCollectionsToJuly) },
          { label: 'Dividends paid', value: formatAmount(YEAR_TO_DATE.dividendsPaid) }
        ]}
        meta="November combines cash, Al Jaloui, CBQ and QNB balances. Earlier months carry a single cash-in-hand figure."
      />

      <nav aria-label="Sections" className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {[
          ['summary', 'Monthly summary'],
          ['contributions', 'Member list'],
          ['fleet', 'Fleet'],
          ['performance', 'Vehicle performance']
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="text-ink/50 underline decoration-rule decoration-1 underline-offset-4 transition-colors hover:text-ink hover:decoration-brass"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="summary"
        title="Cash in hand at each month end"
        description="Every month’s sheet opens with the previous closing balance, so the closing figure is what compares month to month."
        trailing="April – November 2026"
      >
        <div className="rounded-xl border border-rule bg-card/70 p-5">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthRows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chart.brass} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chart.brass} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => v.slice(0, 3)}
                  tick={{ fill: chart.ink, fontSize: 11, opacity: 0.55 }}
                  axisLine={{ stroke: chart.grid }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatCompact(v)}
                  tick={{ fill: chart.ink, fontSize: 11, opacity: 0.55 }}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                />
                <Tooltip
                  formatter={(value) => [`${formatAmount(value)} AED`, 'Cash in hand']}
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: `1px solid ${chart.tooltipBorder}`,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "'Inter', sans-serif"
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke={chart.brass}
                  strokeWidth={2}
                  fill="url(#cashFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6">
          <RegisterTable
            columns={[
              { key: 'label', label: 'Month' },
              {
                key: 'income',
                label: 'Income',
                align: 'right',
                render: (row) => formatAmount(row.income)
              },
              {
                key: 'expenses',
                label: 'Cost',
                align: 'right',
                render: (row) => formatAmount(row.expenses)
              },
              {
                key: 'cash',
                label: 'Cash in hand',
                align: 'right',
                render: (row) => <span className="font-medium text-ink">{formatAmount(row.cash)}</span>
              },
              {
                key: 'movement',
                label: 'Change',
                align: 'right',
                render: (row) =>
                  row.movement === null ? (
                    <span className="text-ink/25">—</span>
                  ) : (
                    <span className={row.movement >= 0 ? 'text-gain' : 'text-loss'}>
                      {row.movement >= 0 ? '+' : '−'}
                      {formatAmount(Math.abs(row.movement))}
                    </span>
                  )
              }
            ]}
            rows={monthRows}
            rowKey="id"
            minWidth="sm:min-w-[36rem]"
            caption="Change compares the closing cash-in-hand balance with the previous month."
          />
        </div>
      </Section>

      <Section
        id="contributions"
        title="Member contribution list"
        description="What each member put in, and what came through Al Jaloui Transportation. The two columns make up the member’s total."
        trailing={`${CONTRIBUTORS.length} members`}
      >
        <RegisterTable
          columns={[
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
              key: 'amount',
              label: 'Member amount',
              align: 'right',
              render: (row) => dash(row.amount)
            },
            {
              key: 'alJaloui',
              label: 'Al Jaloui',
              align: 'right',
              render: (row) => dash(row.alJaloui)
            },
            {
              key: 'total',
              label: 'Total',
              align: 'right',
              render: (row) => (
                <span className="font-medium text-ink">{formatAmount(row.total)}</span>
              )
            }
          ]}
          rows={contributorRows}
          rowKey="id"
          search={{ placeholder: 'Search members…', keys: ['name'] }}
          footer={{
            name: 'Total',
            amount: formatAmount(CONTRIBUTORS_TOTAL.amount),
            alJaloui: formatAmount(CONTRIBUTORS_TOTAL.alJaloui),
            total: formatAmount(CONTRIBUTORS_TOTAL.total)
          }}
          minWidth="sm:min-w-[34rem]"
        />
      </Section>

      <Section
        id="fleet"
        title="Fleet purchased"
        description="Eleven cars bought with member money. The rate is the price paid for each vehicle."
        trailing={`${VEHICLES.length} vehicles · ${formatAmount(fleetCost)} AED`}
      >
        <RegisterTable
          columns={[
            {
              key: 'car',
              label: 'Vehicle',
              render: (row) => (
                <div>
                  <p className="font-medium text-ink">{row.car}</p>
                  <p className="tabular text-[11px] text-ink/40">{row.registration}</p>
                </div>
              )
            },
            { key: 'owner', label: 'Owner', render: (row) => <span className="text-ink/70">{row.owner}</span> },
            { key: 'model', label: 'Model year', align: 'right', secondary: true },
            {
              key: 'ishtemara',
              label: 'Ishtemara date',
              align: 'right',
              secondary: true,
              render: (row) => <span className="tabular text-ink/60">{row.ishtemara}</span>
            },
            {
              key: 'rate',
              label: 'Rate',
              align: 'right',
              render: (row) => formatAmount(row.rate)
            }
          ]}
          rows={VEHICLES.map((v, i) => ({ ...v, id: `${v.car}-${v.registration}`, sl: i + 1 }))}
          footer={{ car: 'Total', rate: formatAmount(fleetCost) }}
          minWidth="sm:min-w-[40rem]"
        />
      </Section>

      <Section
        id="performance"
        title="How each car performed"
        description="Rental income against servicing, repairs and fees, as the workbook’s Car Details sheets record them. Due amounts are rent still owed but counted as income for the car."
        trailing="5 vehicles itemised"
      >
        <RegisterTable
          columns={[
            {
              key: 'car',
              label: 'Vehicle',
              render: (row) => <span className="font-medium text-ink">{row.car}</span>
            },
            {
              key: 'purchase',
              label: 'Bought for',
              align: 'right',
              render: (row) => formatAmount(row.purchase)
            },
            {
              key: 'incomeTotal',
              label: 'Income',
              align: 'right',
              render: (row) => <span className="text-gain">{formatAmount(row.incomeTotal)}</span>
            },
            {
              key: 'expenseTotal',
              label: 'Expenses',
              align: 'right',
              render: (row) => <span className="text-loss">{formatAmount(row.expenseTotal)}</span>
            },
            {
              key: 'balance',
              label: 'Balance',
              align: 'right',
              render: (row) => <span className="font-medium text-ink">{formatAmount(row.balance)}</span>
            }
          ]}
          rows={carRows}
          rowKey="id"
          footer={{
            car: 'Total',
            purchase: formatAmount(carRows.reduce((s, r) => s + r.purchase, 0)),
            incomeTotal: formatAmount(carRows.reduce((s, r) => s + r.incomeTotal, 0)),
            expenseTotal: formatAmount(carRows.reduce((s, r) => s + r.expenseTotal, 0)),
            balance: formatAmount(carRows.reduce((s, r) => s + r.balance, 0))
          }}
          caption="Only the five cars with an itemised sheet are listed. The balance is income less expenses, before the purchase price."
          minWidth="sm:min-w-[36rem]"
        />
      </Section>

      <SourceNote file="Monthly Accounts -2026.xlsx">
        Sheets run April to November. November’s four columns (cash, Al Jaloui, CBQ, QNB)
        and October’s cash and bank columns are added together for the closing figure.
        Car purchase of {formatAmount(YEAR_TO_DATE.carPurchasesToJuly)} to 31 July covered
        the eleven vehicles above.
      </SourceNote>
    </AppShell>
  )
}
