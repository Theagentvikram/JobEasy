import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { auth } from '../firebase/config'
import { toast } from '../lib/toast'

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  config.headers = config.headers || {}

  // Dev token takes priority (no Firebase needed)
  const devToken = localStorage.getItem('dev_token')
  if (devToken) {
    config.headers.Authorization = `Bearer ${devToken}`
    return config
  }

  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ detail?: string }>) => {
    const req = error.config as RetryableConfig | undefined
    if (error.response?.status === 401 && req && !req._retry && auth.currentUser) {
      req._retry = true
      const token = await auth.currentUser.getIdToken(true)
      req.headers = req.headers || {}
      req.headers.Authorization = `Bearer ${token}`
      return api(req)
    }
    if (error.response?.status === 403) {
      const detail = error.response.data?.detail || "You've reached your plan limit. Upgrade to continue."
      toast(detail, 'error')
    }
    return Promise.reject(error)
  }
)

export default api
