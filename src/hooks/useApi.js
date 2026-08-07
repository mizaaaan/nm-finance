import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'

// GET resource hook. Real API errors surface as { status: 'error' }; an
// unreachable endpoint falls back to a clearly-labelled empty state via
// `demo` (the demo dataset is intentionally empty — the app never fabricates
// data). `demo` is kept in a ref so callers may pass an inline closure
// without triggering refetch loops.
export function useApi(path, { demo } = {}) {
  const [state, setState] = useState({ status: 'loading', data: null, isDemo: false, error: null })
  const [tick, setTick] = useState(0)
  const demoRef = useRef(demo)
  demoRef.current = demo

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, status: 'loading', error: null }))

    apiRequest(path)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, isDemo: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        if (err.isUnreachable && demoRef.current) {
          setState({ status: 'ready', data: demoRef.current(), isDemo: true, error: null })
        } else {
          setState({ status: 'error', data: null, isDemo: false, error: err.message })
        }
      })

    return () => {
      cancelled = true
    }
  }, [path, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { ...state, refetch }
}
