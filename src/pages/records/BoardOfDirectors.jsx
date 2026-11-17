import AppShell from '../../components/AppShell'
import DocumentHeader from '../../components/records/DocumentHeader'
import RegisterTable from '../../components/records/RegisterTable'
import SourceNote from '../../components/records/SourceNote'
import { DIRECTORS, DIRECTORS_TOTAL, SHARE_PRICE } from '../../data/records'
import { formatAmount } from '../../lib/format'

export default function BoardOfDirectors() {
  const shares = DIRECTORS.reduce((sum, d) => sum + d.shares, 0)
  const settled = DIRECTORS.filter((d) => d.due === 0).length
  const collected = Math.round((DIRECTORS_TOTAL.collected / DIRECTORS_TOTAL.invested) * 100)

  const rows = DIRECTORS.map((d, i) => ({ ...d, id: d.name, sl: i + 1 }))

  const columns = [
    {
      key: 'sl',
      label: '#',
      className: 'w-10 text-ink/35',
      secondary: true,
      render: (row) => <span className="tabular text-xs">{row.sl}</span>
    },
    {
      key: 'name',
      label: 'Director',
      render: (row) => <span className="font-medium text-ink">{row.name}</span>
    },
    {
      key: 'shares',
      label: 'Shares',
      align: 'right',
      secondary: true,
      render: (row) => row.shares
    },
    {
      key: 'invested',
      label: 'Committed',
      align: 'right',
      render: (row) => formatAmount(row.invested)
    },
    {
      key: 'collected',
      label: 'Collected',
      align: 'right',
      render: (row) => formatAmount(row.collected)
    },
    {
      key: 'due',
      label: 'Outstanding',
      align: 'right',
      render: (row) =>
        row.due === 0 ? (
          <span className="inline-flex rounded-full bg-gain/10 px-2 py-0.5 text-[11px] font-medium text-gain">
            Paid
          </span>
        ) : (
          <span className="font-medium text-loss">{formatAmount(row.due)}</span>
        )
    },
    {
      key: 'phone',
      label: 'Contact',
      secondary: true,
      render: (row) =>
        row.phone ? <span className="tabular text-xs text-ink/50">{row.phone}</span> : null
    }
  ]

  return (
    <AppShell>
      <DocumentHeader
        id="board"
        lede={`${DIRECTORS.length} directors hold five shares each at ${formatAmount(
          SHARE_PRICE
        )} per share. The table tracks what each has paid in and what remains on their commitment.`}
        figures={[
          { label: 'Committed (AED)', value: formatAmount(DIRECTORS_TOTAL.invested) },
          { label: 'Collected', value: formatAmount(DIRECTORS_TOTAL.collected) },
          { label: 'Outstanding', value: formatAmount(DIRECTORS_TOTAL.due) },
          { label: 'Paid in full', value: `${settled} of ${DIRECTORS.length}` }
        ]}
        meta={`${collected}% of the directors’ commitment has been collected. ${shares} shares are subscribed.`}
      />

      <section className="mt-8">
        <RegisterTable
          columns={columns}
          rows={rows}
          search={{ placeholder: 'Search directors…', keys: ['name'] }}
          footer={{
            name: 'Total',
            shares,
            invested: formatAmount(DIRECTORS_TOTAL.invested),
            collected: formatAmount(DIRECTORS_TOTAL.collected),
            due: formatAmount(DIRECTORS_TOTAL.due)
          }}
          minWidth="sm:min-w-[44rem]"
        />
      </section>

      <SourceNote file="Board of Directors.xlsx">
        Rows are reproduced in the workbook’s order. Bellal’s balance is shown as the sheet
        records it ({formatAmount(15000)}), although {formatAmount(1000)} has been collected
        against it. Contacts appear only where the workbook holds a number.
      </SourceNote>
    </AppShell>
  )
}
