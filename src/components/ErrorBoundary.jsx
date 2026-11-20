import { Component } from 'react'

// Catches rendering crashes so a bug in one screen shows a clear message with a
// reload button instead of a blank white page.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error('Unexpected UI error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-6">
        <div className="max-w-md rounded-2xl border border-rule bg-card/70 p-8 text-center">
          <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/65">
            The page hit an unexpected problem. Your data is safe — reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg border border-transparent bg-brass px-4 py-2.5 text-sm font-medium text-navy shadow-sm transition-all hover:border-brass hover:bg-transparent hover:text-brass"
          >
            Reload the page
          </button>
        </div>
      </div>
    )
  }
}
