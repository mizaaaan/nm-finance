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

// 2026 records, one page per workbook.
const Documents = lazy(() => import('./pages/records/Documents'))
const BoardOfDirectors = lazy(() => import('./pages/records/BoardOfDirectors'))
const Dividends = lazy(() => import('./pages/records/Dividends'))
const Installments = lazy(() => import('./pages/records/Installments'))
const DirectorPnl = lazy(() => import('./pages/records/DirectorPnl'))
const MonthlyAccounts = lazy(() => import('./pages/records/MonthlyAccounts'))

const protectedRoutes = [
  { path: '/', element: <Dashboard /> },
  { path: '/ledger', element: <Ledger /> },
  { path: '/members', element: <Members /> },
  { path: '/cars', element: <Cars /> },
  { path: '/documents', element: <Documents /> },
  { path: '/documents/board', element: <BoardOfDirectors /> },
  { path: '/documents/dividends', element: <Dividends /> },
  { path: '/documents/installments', element: <Installments /> },
  { path: '/documents/director-pnl', element: <DirectorPnl /> },
  { path: '/documents/months', element: <MonthlyAccounts /> }
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
