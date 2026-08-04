import { formatMoney } from '../../lib/format'
import TypeChip from '../TypeChip'

const CATEGORY_LABELS = {
  driver_rent: 'Driver rent',
  other_income: 'Other income',
  member_contribution: 'Contribution',
  car_maintenance: 'Maintenance',
  insurance: 'Insurance',
  registration: 'Registration',
  fuel: 'Fuel',
  office_expense: 'Office',
  dividend_payout: 'Dividend'
}

export default function RecentTable({ rows }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl text-ink">Recent activity</h2>
      <div className="mt-4 overflow-hidden rounded-xl border border-rule bg-card/70">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink/50">
            No transactions yet — entries will show up here as they're posted.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  {['Date', 'Description', 'Type', 'Amount'].map((h) => (
                    <th
                      key={h}
                      className="tabular px-5 py-3 text-[10px] font-medium uppercase tracking-[0.18em] text-ink/40"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/60">
                {rows.map((row) => {
                  const outflow = row.type === 'expense' || row.type === 'dividend'
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-paper/70">
                      <td className="tabular whitespace-nowrap px-5 py-3 text-ink/60">{row.date}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-ink">{row.description || '—'}</p>
                        <p className="tabular text-xs text-ink/40">
                          {CATEGORY_LABELS[row.category] || row.category}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <TypeChip type={row.type} />
                      </td>
                      <td
                        className={`tabular whitespace-nowrap px-5 py-3 text-right font-medium ${
                          outflow ? 'text-loss' : 'text-gain'
                        }`}
                      >
                        {outflow ? '−' : '+'}
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
