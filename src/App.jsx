import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import Splash from './components/Splash'

// Code-split heavier pages (recharts & CRUD screens) so the login bundle stays lean.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Ledger = lazy(() => import('./pages/Ledger'))
const Members = lazy(() => import('./pages/Members'))
const Cars = lazy(() => import('./pages/Cars'))

const protectedRoutes = [
  { path: '/', element: <Dashboard /> },
  { path: '/ledger', element: <Ledger /> },
  { path: '/members', element: <Members /> },
  { path: '/cars', element: <Cars /> }
]

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Suspense fallback={<Splash label="Opening the ledger…" />}>
                <Routes>
                  {protectedRoutes.map((r) => (
                    <Route key={r.path} path={r.path} element={r.element} />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
