export function Field({ label, id, type = 'text', value, onChange, placeholder, autoComplete, required, step, min }) {
  return (
    <label htmlFor={id} className="block">
      <span className="tabular block text-[11px] uppercase tracking-[0.16em] text-ink/50">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        step={step}
        min={min}
        className="mt-1.5 w-full rounded-md border border-rule bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink/25 focus:border-brass"
      />
    </label>
  )
}

export function SelectField({ label, id, value, onChange, options, required }) {
  return (
    <label htmlFor={id} className="block">
      <span className="tabular block text-[11px] uppercase tracking-[0.16em] text-ink/50">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1.5 w-full rounded-md border border-rule bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brass"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-md border-l-2 border-loss bg-loss/5 px-3 py-2.5 text-sm text-loss">
      {message}
    </div>
  )
}
