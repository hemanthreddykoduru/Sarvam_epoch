import { createClient } from '@insforge/sdk'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { AuthState, User } from '@/types'

const AuthContext = createContext<AuthState | undefined>(undefined)

// Authenticated insforge client that uses the user's JWT for RLS-compliant DB access
function getAuthenticatedClient(token: string) {
  return createClient({
    baseUrl: import.meta.env.VITE_INSFORGE_URL,
    anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
    accessToken: token,
  })
}

function decodeJwtPayload(token: string): { sub?: string; email?: string; exp?: number; user_metadata?: any } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}

// Cache key for persisting real profile across reloads
const PROFILE_CACHE_KEY = 'bde_profile_cache'

function getCachedProfile(): Partial<User> | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setCachedProfile(profile: Partial<User>) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
  } catch {}
}

function clearCachedProfile() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY)
  } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('insforge_access_token')
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      const payload = decodeJwtPayload(token)
      if (payload?.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        localStorage.removeItem('insforge_access_token')
        localStorage.removeItem('insforge_refresh_token')
        clearCachedProfile()
        setUser(null)
        setLoading(false)
        return
      }

      // JWT fallback name (the bad username from email prefix)
      const jwtName = payload?.user_metadata?.full_name || payload?.user_metadata?.name || payload?.email?.split('@')[0] || ''
      const emailFromJwt = payload?.email || ''

      // Immediately use cached profile if available (prevents flash of wrong username on reload)
      const cached = getCachedProfile()
      const baseUser: User = {
        id: payload?.sub || '',
        email: emailFromJwt,
        full_name: cached?.full_name || jwtName,
        role: cached?.role || 'user',
        plan: cached?.plan || 'free',
        credits_remaining: cached?.credits_remaining ?? 10,
        created_at: cached?.created_at || new Date().toISOString(),
      }

      setUser(baseUser)
      setLoading(false)

      // Fetch real profile from backend API (uses adminClient, bypasses RLS — always reliable)
      const fetchProfile = async () => {
        try {
          const { data: profile } = await api.get<User>('/auth/me')
          if (profile) {
            const merged: Partial<User> = {
              plan: profile.plan || 'free',
              credits_remaining: profile.credits_remaining ?? 10,
              role: profile.role || 'user',
              full_name: profile.full_name || jwtName,
              created_at: profile.created_at || new Date().toISOString(),
            }
            // Cache so next reload shows correct name instantly
            setCachedProfile(merged)
            setUser(prev => prev ? { ...prev, ...merged } : prev)
            return
          }
        } catch {}

        // Fallback: use authenticated InsForge client (user JWT bypasses RLS)
        try {
          const authedClient = getAuthenticatedClient(token)
          const { data: rows } = await authedClient.database
            .from('users')
            .select('*')
            .eq('email', emailFromJwt)

          const dbUser = Array.isArray(rows) ? rows[0] : rows
          if (dbUser) {
            const merged: Partial<User> = {
              plan: dbUser.plan || 'free',
              credits_remaining: dbUser.credits_remaining ?? 10,
              role: dbUser.role || 'user',
              full_name: dbUser.full_name || jwtName,
              created_at: dbUser.created_at || new Date().toISOString(),
            }
            setCachedProfile(merged)
            setUser(prev => prev ? { ...prev, ...merged } : prev)
          }
        } catch {}
      }

      fetchProfile()
    } catch {
      const token = localStorage.getItem('insforge_access_token')
      if (token) {
        const payload = decodeJwtPayload(token)
        if (payload?.sub) {
          const cached = getCachedProfile()
          setUser({
            id: payload.sub,
            email: payload.email || '',
            full_name: cached?.full_name || payload.user_metadata?.full_name || payload.user_metadata?.name || payload.email?.split('@')[0] || '',
            role: cached?.role || 'user',
            plan: cached?.plan || 'free',
            credits_remaining: cached?.credits_remaining ?? 10,
            created_at: cached?.created_at || new Date().toISOString(),
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const insforge = getAuthenticatedClient('')
      const { data, error } = await insforge.auth.signInWithPassword({ email, password })
      if (error) return { error: (error as any).message || 'Login failed' }

      if (data) {
        const accessToken = (data as any).accessToken || (data as any).access_token
        const refreshToken = (data as any).refreshToken || (data as any).refresh_token
        if (accessToken) {
          localStorage.setItem('insforge_access_token', accessToken)
          if (refreshToken) {
            localStorage.setItem('insforge_refresh_token', refreshToken)
          }

          const payload = decodeJwtPayload(accessToken)
          const jwtName = payload?.user_metadata?.full_name || payload?.user_metadata?.name || payload?.email?.split('@')[0] || ''
          setUser({
            id: payload?.sub || '',
            email: payload?.email || '',
            full_name: jwtName,
            role: 'user',
            plan: 'free',
            credits_remaining: 10,
            created_at: new Date().toISOString(),
          })

          // Immediately fetch real profile after login
          api.get<User>('/auth/me').then(({ data: profile }) => {
            if (profile) {
              const merged: Partial<User> = {
                plan: profile.plan || 'free',
                credits_remaining: profile.credits_remaining ?? 10,
                role: profile.role || 'user',
                full_name: profile.full_name || jwtName,
                created_at: profile.created_at || new Date().toISOString(),
              }
              setCachedProfile(merged)
              setUser(prev => prev ? { ...prev, ...merged } : prev)
            }
          }).catch(async () => {
            try {
              const authedClient = getAuthenticatedClient(accessToken)
              const { data: rows } = await authedClient.database
                .from('users').select('*').eq('email', email)
              const dbUser = Array.isArray(rows) ? rows[0] : rows
              if (dbUser) {
                const merged: Partial<User> = {
                  plan: dbUser.plan || 'free',
                  credits_remaining: dbUser.credits_remaining ?? 10,
                  role: dbUser.role || 'user',
                  full_name: dbUser.full_name || jwtName,
                  created_at: dbUser.created_at || new Date().toISOString(),
                }
                setCachedProfile(merged)
                setUser(prev => prev ? { ...prev, ...merged } : prev)
              }
            } catch {}
          })
        }
      }
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const insforge = getAuthenticatedClient('')
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) return { data: null, error: (error as any).message || 'Registration failed' }
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const insforge = getAuthenticatedClient('')
      const { data, error } = await insforge.auth.signInWithOAuth('google', {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      if (error) throw error
      if ((data as any)?.url) {
        window.location.href = (data as any).url
      }
    } catch (err) {
      console.error('Google sign in error:', err)
    }
  }

  const signOut = async () => {
    try {
      const insforge = getAuthenticatedClient('')
      await insforge.auth.signOut()
    } catch {
      // Ignore signOut errors - just clear local state
    }
    localStorage.removeItem('insforge_access_token')
    localStorage.removeItem('insforge_refresh_token')
    clearCachedProfile()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
