import { useCallback, useEffect, useState } from 'react'
import { demoData } from '../lib/demoData'
import { authToken } from '../lib/api'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Fetches /api/dashboard?month=YYYY-MM.
//  • A real API error (4xx/5xx) is surfaced so deployment problems aren't hidden.
//  • If the endpoint simply isn't there (local dev before the DB is provisioned,
//    or the SPA fallback returns HTML), fall back to a clearly-labelled empty
//    state — demoData is intentionally empty, the app never fabricates figures.
export function useDashboard(month) {
  const [state, setState] = useState({ status: 'loading', data: null, isDemo: false, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    setState({ status: 'loading', data: null, isDemo: false, error: null })

    ;(async () => {
      const token = await authToken()
      return fetch(`/api/dashboard?month=${encodeURIComponent(month)}`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
    })()
      .then(async (res) => {
        if (!res.ok) {
          let message = `The dashboard API responded ${res.status}.`
          try {
            const body = await res.json()
            if (body?.error) message = body.error
          } catch {
            // non-JSON error body
          }
          throw new ApiError(message, res.status)
        }
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data, isDemo: false, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError) {
          setState({ status: 'error', data: null, isDemo: false, error: err.message })
        } else {
          // Network failure / timeout / non-API response → sample data
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
