import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { autoapply } from '../services/autoapply'
import { autopilot } from '../services/autopilot'

/**
 * Silently prefetches all page data right after the user authenticates.
 * By the time they navigate to any page, the React Query cache is already warm.
 */
export default function Prefetcher() {
  const { user } = useAuth()
  const qc = useQueryClient()

  useEffect(() => {
    if (!user) return

    // Prefetch all page data in parallel — no await, purely background
    qc.prefetchQuery({
      queryKey: ['tracker-jobs'],
      queryFn: async () => {
        const [jobsRes, resumesRes] = await Promise.all([
          api.get('/referral/jobs'),
          api.get('/resumes'),
        ])
        const rawJobs = jobsRes.data?.jobs || jobsRes.data || []
        const resumes: { id: string; title: string; autopilot_company?: string }[] = resumesRes.data || []
        const autopilotMap: Record<string, string> = {}
        for (const r of resumes) {
          const company = (r.autopilot_company || '').toLowerCase().trim()
          if (company && r.title?.startsWith('[AutoPilot]')) {
            if (!autopilotMap[company]) autopilotMap[company] = r.id
          }
        }
        return rawJobs.map((j: { autopilot_resume_id?: string; company?: string }) => {
          if (j.autopilot_resume_id) return j
          const key = (j.company || '').toLowerCase().trim()
          return autopilotMap[key] ? { ...j, autopilot_resume_id: autopilotMap[key] } : j
        })
      },
      staleTime: 2 * 60 * 1000,
    })

    qc.prefetchQuery({
      queryKey: ['desk-profiles'],
      queryFn: () => api.get('/user/desk/profiles').then(r => r.data),
      staleTime: 5 * 60 * 1000,
    })

    qc.prefetchQuery({
      queryKey: ['autopilot-sessions'],
      queryFn: () => autopilot.listSessions().then(r => r.data),
      staleTime: 30 * 1000,
    })

    qc.prefetchQuery({
      queryKey: ['autopilot-desk-text'],
      queryFn: () => api.get('/user/desk/text').then(r => r.data),
      staleTime: 5 * 60 * 1000,
    })

    qc.prefetchQuery({
      queryKey: ['autopilot-settings'],
      queryFn: () => api.get('/auth/settings').then(r => r.data),
      staleTime: 10 * 60 * 1000,
    })

    // AutoApply — only prefetch health + stats (skip heavy jobs list until page visit)
    qc.prefetchQuery({
      queryKey: ['autoapply-health'],
      queryFn: () => autoapply.health().then(() => true),
      staleTime: 30 * 1000,
    })

    qc.prefetchQuery({
      queryKey: ['autoapply-stats'],
      queryFn: () => autoapply.getStats().then(r => r.data),
      staleTime: 60 * 1000,
    })

    qc.prefetchQuery({
      queryKey: ['autoapply-settings'],
      queryFn: () => autoapply.getSettings().then(r => r.data).catch(() => null),
      staleTime: 5 * 60 * 1000,
    })
  }, [user?.uid])  // re-run only when user changes (login/logout)

  return null
}
