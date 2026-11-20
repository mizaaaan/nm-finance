import { useCallback, useEffect, useState } from 'react'
import { demoData } from '../lib/demoData'
import { apiRequest, ApiError } from '../lib/api'

// Fetches /api/dashboard?month=YYYY-MM.
//  • A real API error (4xx/5xx) is surfaced so deployment problems aren't hidden.
//  • If the endpoint simply isn't there (local dev before the DB is provisioned,
//    or a network failure / timeout), fall back to a clearly-labelled empty
//    state — demoData is intentionally empty, the app never fabricates figures.
export function useDashboard(month) {
  const [state, setState] = useState({ status: 'loading', data: null, isDemo: false, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    // Generous timeout: Netlify cold starts can take several seconds, and an
    // abort here would fall back to the empty state and falsely show "Offline".
    const timer = setTimeout(() => controller.abort(), 15000)

    setState({ status: 'loading', data: null, isDemo: false, error: null })

    apiRequest(`/api/dashboard?month=${encodeURIComponent(month)}`, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, isDemo: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setState({ status: 'error', data: null, isDemo: false, error: err.message })
        } else {
          // Network failure / timeout / non-API response → empty state
          setState({ status: 'ready', data: demoData(month), isDemo: true, error: null })
        }
      })
      .finally(() => clearTimeout(timer))

    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [month, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { ...state, refetch }
}
