import { useNavigate } from 'react-router-dom'
import { COMPANY, DOCUMENTS } from '../../data/records'

// The header every 2026 record opens with: which document, what it covers,
// and the figures that matter at the top of the sheet.
export default function DocumentHeader({ id, lede, figures, meta, children }) {
  const doc = DOCUMENTS.find((d) => d.id === id)
  const navigate = useNavigate()

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <p className="tabular text-[11px] font-semibold uppercase tracking-[0.06em] text-brass">
            Records · {COMPANY.period}
          </p>
          <h1 className="font-display mt-1 text-3xl text-ink sm:text-4xl">{doc.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">{lede}</p>
        </div>

        <label className="relative block shrink-0">
          <span className="sr-only">Choose a document</span>
          <select
            value={doc.id}
            onChange={(e) => navigate(e.target.value)}
            className="w-full appearance-none rounded-lg border border-rule bg-card/80 py-2.5 pl-3 pr-9 text-sm font-medium text-ink outline-none transition-colors hover:border-ink/30 focus:border-brass sm:w-auto"
          >
            {DOCUMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </label>
      </div>

      <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-4">
        {figures.map((f, i) => (
          <div key={f.label} className="bg-navy px-5 py-4">
            <dt className="text-[11px] leading-tight text-white/55">{f.label}</dt>
            <dd
              className={`tabular mt-2 text-xl font-medium tracking-tight sm:text-2xl ${
                i === 0 ? 'text-brass-light' : 'text-white'
              }`}
            >
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      {meta && <p className="mt-2 text-[11px] leading-relaxed text-ink/40">{meta}</p>}
      {children}
    </header>
  )
}
