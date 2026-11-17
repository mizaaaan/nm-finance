import AppShell from '../../components/AppShell'
import DocumentHeader from '../../components/records/DocumentHeader'
import RegisterTable from '../../components/records/RegisterTable'
import SourceNote from '../../components/records/SourceNote'
import { INSTALLMENTS } from '../../data/records'
import { formatAmount } from '../../lib/format'

export default function Installments() {
  const rows = INSTALLMENTS.map((c, i) => {
    const paid = c.paid.reduce((sum, v) => sum + v, 0)
    const received = c.down + paid
    return { ...c, id: c.buyer, sl: i + 1, paidSum: paid, received, outstanding: c.contract - received }
  })

  const contract = rows.reduce((sum, r) => sum + r.contract, 0)
  const received = rows.reduce((sum, r) => sum + r.received, 0)
  const outstanding = contract - received

  const columns = [
    {
      key: 'sl',
      label: '#',
      className: 'w-10 text-ink/35',
      render: (row) => <span className="tabular text-xs">{row.sl}</span>
    },
    {
      key: 'buyer',
      label: 'Buyer',
      render: (row) => (
        <div className="min-w-[10rem]">
          <p className="font-medium text-ink">{row.buyer}</p>
          <p className="tabular text-[11px] text-ink/40">
            QID {row.qid} · {row.mobile}
          </p>
        </div>
      )
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (row) => (
        <div>
          <p className="text-ink/80">{row.vehicle}</p>
          <p className="tabular text-[11px] text-ink/40">Received {row.date}</p>
        </div>
      )
    },
    {
      key: 'contract',
      label: 'Contract',
      align: 'right',
      render: (row) => formatAmount(row.contract)
    },
    {
      key: 'down',
      label: 'Down payment',
      align: 'right',
      secondary: true,
      render: (row) => (row.down ? formatAmount(row.down) : '—')
    },
    {
      key: 'installment',
      label: 'Instalment',
      align: 'right',
      secondary: true,
      render: (row) => formatAmount(row.installment)
    },
    {
      key: 'received',
      label: 'Received',
      align: 'right',
      render: (row) => (
        <div className="min-w-[7rem]">
          <p className="tabular font-medium text-ink">{formatAmount(row.received)}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-rule/70">
            <div
              className="h-full rounded-full bg-brass"
              style={{ width: `${Math.min(100, (row.received / row.contract) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink/40">
            {row.paid.length} {row.paid.length === 1 ? 'instalment' : 'instalments'} paid
          </p>
        </div>
      )
    },
    {
      key: 'outstanding',
      label: 'Outstanding',
      align: 'right',
      render: (row) => (
        <span className="font-medium text-loss">{formatAmount(row.outstanding)}</span>
      )
    }
  ]

  return (
    <AppShell>
      <DocumentHeader
        id="installments"
        lede="Cars sold on installment through Al Jaloui Transportation. Each contract lists the buyer, the vehicle’s value including profit, and every instalment received so far."
        figures={[
          { label: 'Contract value (AED)', value: formatAmount(contract) },
          { label: 'Received', value: formatAmount(received) },
          { label: 'Outstanding', value: formatAmount(outstanding) },
          { label: 'Contracts', value: String(rows.length) }
        ]}
        meta={`${Math.round((received / contract) * 100)}% of the contract value on the books has been collected.`}
      />

      <section className="mt-8">
        <RegisterTable
          columns={columns}
          rows={rows}
          search={{ placeholder: 'Search buyers…', keys: ['buyer', 'vehicle'] }}
          footer={{
            buyer: 'Total',
            contract: formatAmount(contract),
            down: formatAmount(rows.reduce((s, r) => s + r.down, 0)),
            installment: '',
            received: formatAmount(received),
            outstanding: formatAmount(outstanding)
          }}
          caption="Received = down payment + instalments already paid. Outstanding = contract value − received."
          minWidth="sm:min-w-[52rem]"
        />
      </section>

      <SourceNote file="Car Sale Installment.xlsx">
        The workbook tracks six instalment slots per contract; only paid slots are shown
        here. Lokman Hossain’s contract has no vehicle recorded in the sheet. Abzal
        Hossain’s contract carries a {formatAmount(135)} fine noted beside the instalment
        ledger.
      </SourceNote>
    </AppShell>
  )
}
