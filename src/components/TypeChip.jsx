const STYLES = {
  income: 'bg-gain/10 text-gain',
  contribution: 'bg-brass/15 text-brass',
  expense: 'bg-loss/10 text-loss',
  dividend: 'bg-ink/10 text-ink/70'
}

const LABELS = {
  income: 'Income',
  contribution: 'Contribution',
  expense: 'Expense',
  dividend: 'Dividend'
}

export default function TypeChip({ type }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        STYLES[type] || 'bg-ink/5 text-ink/60'
      }`}
    >
      {LABELS[type] || type}
    </span>
  )
}
