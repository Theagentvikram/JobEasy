import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui'

export function DashboardLayout() {
  const { firebaseUser, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-slate-950">
        <Spinner size={28} />
      </div>
    )
  }

  // Allow access if logged in via Firebase OR dev token
  if (!firebaseUser && !user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
