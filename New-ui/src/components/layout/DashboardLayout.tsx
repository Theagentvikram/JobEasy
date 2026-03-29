import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../ui'

export function DashboardLayout() {
  const { firebaseUser, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-dark-bg">
        <Spinner size={28} />
      </div>
    )
  }

  // Allow access if logged in via Firebase OR dev token
  if (!firebaseUser && !user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-dark-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-4 sm:p-5 lg:p-6 xl:p-8 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
