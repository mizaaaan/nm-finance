export default function SourceNote({ file, children }) {
  return (
    <p className="mt-8 max-w-3xl border-t border-rule pt-4 text-xs leading-relaxed text-ink/40">
      <span className="font-medium text-ink/60">{file}</span> — {children}
    </p>
  )
}
