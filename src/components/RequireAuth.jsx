import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Splash from './Splash'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <Splash label="Opening the ledger…" />
  if (!user) return <Navigate to="/login" replace />

  return children
}
