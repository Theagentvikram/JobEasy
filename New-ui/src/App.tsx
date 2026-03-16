import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { Toaster } from './components/ui'

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

export default function App() {
  // Use /new basename in production (served from /new/ subdirectory)
  const basename = import.meta.env.PROD ? '/new' : '/'

  return (
    <BrowserRouter basename={basename}>
      <ThemeProvider>
        <AuthProvider>
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
  )
}
