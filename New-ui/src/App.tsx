import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min default
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Toaster } from './components/ui'
import RouteProgressBar from './components/RouteProgressBar'
import Prefetcher from './components/Prefetcher'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardHome from './pages/DashboardHome'
import ATSScanner from './pages/ATSScanner'
import ResumeList from './pages/ResumeList'
import ResumeEditor from './pages/ResumeEditor'
import CareerDesk from './pages/CareerDesk'
import JobTracker from './pages/JobTracker'
import AIAssistant from './pages/AIAssistant'
import Pricing from './pages/Pricing'
import Settings from './pages/Settings'
import AutoApplyPage from './pages/AutoApply'
import AutoPilotPage from './pages/AutoPilot'
import AutopilotCommand from './pages/AutopilotCommand'
import GoogleSheetsPage from './pages/GoogleSheets'

export default function App() {
  // /new basename always — proxied via root Vite in dev, served from /new/ in prod
  const basename = '/new'

  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <AuthProvider>
          <Prefetcher />
          <RouteProgressBar />
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected dashboard */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="ats" element={<ATSScanner />} />
              <Route path="resumes" element={<ResumeList />} />
              <Route path="desk" element={<CareerDesk />} />
              <Route path="tracker" element={<JobTracker />} />
              <Route path="assistant" element={<AIAssistant />} />
              <Route path="plans" element={<Pricing />} />
              <Route path="autoapply" element={<AutoApplyPage />} />
              <Route path="autopilot" element={<AutoPilotPage />} />
              <Route path="command" element={<AutopilotCommand />} />
              <Route path="sheets" element={<GoogleSheetsPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Resume editor — full screen, outside dashboard layout */}
            <Route path="/dashboard/resumes/:id/edit" element={<ResumeEditor />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
    </QueryClientProvider>
  )
}
