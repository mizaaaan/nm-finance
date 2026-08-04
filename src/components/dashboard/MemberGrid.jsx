import { formatMoney } from '../../lib/format'

export default function MemberGrid({ members }) {
  if (!members.length) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-rule bg-white/40 p-10 text-center">
        <p className="font-display text-xl text-ink">No members yet</p>
        <p className="mt-2 text-sm text-ink/50">
          Add members and their contributions will appear here, alongside dividends paid.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl text-ink">Members · investment vs dividends</h2>
        <p className="tabular hidden text-xs text-ink/40 sm:block">{members.length} members</p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => {
          const returned = m.contributions > 0 ? (m.dividends / m.contributions) * 100 : 0
          return (
            <div
              key={m.id}
              className="rounded-xl border border-rule bg-white/70 p-5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgba(15,31,61,0.3)]"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-medium text-ink">{m.name}</h3>
                {m.role === 'admin' && (
                  <span className="rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brass">
                    Admin
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="tabular text-[10px] uppercase tracking-[0.16em] text-ink/45">
                    Invested
                  </p>
                  <p className="tabular mt-1 text-lg font-medium text-ink">
                    {formatMoney(m.contributions)}
                  </p>
                </div>
                <div>
                  <p className="tabular text-[10px] uppercase tracking-[0.16em] text-ink/45">
                    Dividends
                  </p>
                  <p className="tabular mt-1 text-lg font-medium text-gain">
                    {formatMoney(m.dividends)}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-ink/45">Returned</span>
                  <span className="tabular font-medium text-ink/70">{returned.toFixed(0)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rule/60">
                  <div
                    className="h-full rounded-full bg-brass transition-all"
                    style={{ width: `${Math.min(100, returned)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t border-rule pt-3">
                <span className="text-xs text-ink/45">Net position</span>
                <span
                  className={`tabular text-sm font-semibold ${
                    m.net >= 0 ? 'text-ink' : 'text-loss'
                  }`}
                >
                  {formatMoney(m.net)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
