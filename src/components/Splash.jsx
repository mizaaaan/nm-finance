import Spinner from './Spinner'

export default function Splash({ label }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-paper">
      <div className="text-center">
        <p className="tabular text-[10px] uppercase tracking-[0.24em] text-brass">Next Millionaire MBS</p>
        <h1 className="font-display text-3xl text-ink mt-1">NM Finance</h1>
      </div>
      <Spinner className="h-6 w-6 text-brass" />
      {label && (
        <p className="tabular text-[11px] uppercase tracking-[0.2em] text-ink/40">{label}</p>
      )}
    </div>
  )
}
