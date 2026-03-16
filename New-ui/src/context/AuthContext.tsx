import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUserType,
} from 'firebase/auth'
import { auth } from '../firebase/config'
import api from '../services/api'
import type { User } from '../types'

interface AuthContextValue {
  firebaseUser: FirebaseUserType | null
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  guestLogin: () => Promise<void>
  devLogin: () => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const isDevSession = useRef(false)
  // Deduplicates concurrent fetchUser calls — only one in-flight at a time
  const fetchPromise = useRef<Promise<void> | null>(null)

  const fetchUser = (): Promise<void> => {
    if (fetchPromise.current) return fetchPromise.current

    const run = async () => {
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          const res = await api.get('/auth/me')
          setUser(res.data)
          return
        } catch (err) {
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
          } else {
            console.error('fetchUser failed after retries:', err)
            setUser(null)
          }
        }
      }
    }

    fetchPromise.current = run().finally(() => {
      fetchPromise.current = null
    })
    return fetchPromise.current
  }

  useEffect(() => {
    const devToken = localStorage.getItem('dev_token')

    // Dev token exists — restore session immediately, skip Firebase entirely
    if (devToken) {
      isDevSession.current = true
      api.get('/auth/me').then((res) => {
        setUser(res.data)
      }).catch(() => {
        localStorage.removeItem('dev_token')
        isDevSession.current = false
      }).finally(() => {
        setLoading(false)
      })
      return // don't even subscribe to onAuthStateChanged
    }

    // Normal Firebase flow
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        await fetchUser()
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    // onAuthStateChanged will fire and call fetchUser — no need to call it again
  }

  const signUp = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    // onAuthStateChanged will fire and call fetchUser
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
    // onAuthStateChanged will fire and call fetchUser
  }

  const guestLogin = async () => {
    await signInAnonymously(auth)
    // onAuthStateChanged will fire and call fetchUser
  }

  const devLogin = async () => {
    const res = await api.post('/auth/dev-login')
    const { token, user: devUser } = res.data
    localStorage.setItem('dev_token', token)
    isDevSession.current = true
    setUser(devUser)
    setLoading(false)
  }

  const logout = async () => {
    localStorage.removeItem('dev_token')
    isDevSession.current = false
    await signOut(auth)
    setUser(null)
    setFirebaseUser(null)
  }

  const refreshUser = async () => {
    fetchPromise.current = null // force a fresh fetch
    await fetchUser()
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, signInWithEmail, signUp, signInWithGoogle, guestLogin, devLogin, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
