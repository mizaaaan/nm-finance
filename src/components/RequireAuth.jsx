import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Splash from './Splash'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Splash label="Opening the ledger…" />
  // Keep the hash so a #recovery_token from the reset-password email survives
  // the redirect and LoginPage can show the "set new password" form.
  if (!user) return <Navigate to={{ pathname: '/login', hash: location.hash }} replace />

  return children
}
