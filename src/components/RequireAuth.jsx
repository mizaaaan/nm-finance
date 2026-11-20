import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AccessGate from './AccessGate'
import Splash from './Splash'

export default function RequireAuth({ children }) {
  const { user, loading, access, accessStatus } = useAuth()
  const location = useLocation()

  if (loading) return <Splash label="Opening the ledger…" />
  // Keep the hash so a #recovery_token from the reset-password email survives
  // the redirect and LoginPage can show the "set new password" form.
  if (!user) return <Navigate to={{ pathname: '/login', hash: location.hash }} replace />

  // Signed in — now ask the server what this account may do before showing any data.
  if (accessStatus === 'idle' || accessStatus === 'loading') {
    return <Splash label="Checking your access…" />
  }
  if (accessStatus === 'error') return <AccessGate kind="error" />
  if (access === 'none') return <AccessGate kind="pending" />

  return children
}
