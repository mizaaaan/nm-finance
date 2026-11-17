import { useState } from 'react'

// A register: the ruled sheet the 2026 workbooks are built on. Columns carry
// their own renderer so each document decides how a figure or a balance reads.
export default function RegisterTable({
  columns,
  rows,
  rowKey = 'id',
  search,
  footer,
  caption,
  minWidth = 'sm:min-w-[32rem]'
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown =
    q && search
      ? rows.filter((row) =>
          search.keys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
        )
      : rows

  return (
    <div>
      {search && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            className="w-full rounded-lg border border-rule bg-card/70 px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-brass sm:w-64"
          />
          <p className="tabular text-xs text-ink/40">
            {q ? `${shown.length} of ${rows.length}` : `${rows.length} rows`}
          </p>
        </div>
      )}

      <div className="mt-3 overflow-x-auto border-t-2 border-ink/80">
        <table className={`w-full ${minWidth} text-sm`}>
          <thead>
            <tr className="border-b border-ink/15">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`whitespace-nowrap px-2 py-2.5 text-left text-[11px] font-medium text-ink/45 sm:px-3 ${
                    col.align === 'right' ? 'text-right' : ''
                  } ${col.secondary ? 'hidden sm:table-cell' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-ink/45">
                  No row matches “{query}”.
                </td>
              </tr>
            ) : (
              shown.map((row, i) => (
                <tr
                  key={row[rowKey] ?? i}
                  className="border-b border-rule/70 transition-colors hover:bg-brass/[0.06]"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-2 py-2.5 align-middle sm:px-3 ${
                        col.align === 'right' ? 'tabular text-right' : ''
                      } ${col.secondary ? 'hidden sm:table-cell' : ''} ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {footer && shown.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-ink/80 bg-card/80">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2 py-3 text-[13px] font-semibold text-ink sm:px-3 ${
                      col.align === 'right' ? 'tabular text-right' : ''
                    } ${col.secondary ? 'hidden sm:table-cell' : ''}`}
                  >
                    {footer[col.key] ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {caption && <p className="mt-2 text-xs leading-relaxed text-ink/40">{caption}</p>}
    </div>
  )
}
