import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../types/profile'

const PROFILE_COLUMNS = 'id, email, display_name, wp, gold, rank, role' as const

function displayNameFromUser(user: User): string {
  const meta = user.user_metadata
  const fromMeta =
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim())
  if (fromMeta) return fromMeta
  const local = user.email?.split('@')[0]
  return local && local.length > 0 ? local : 'Student'
}

async function ensureProfileIfMissing(user: User): Promise<void> {
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? null,
    display_name: displayNameFromUser(user),
    wp: 0,
    gold: 0,
    rank: 'Initiate',
    role: 'student',
  })
  if (error && error.code !== '23505') {
    console.error('ensure profile:', error.message)
  }
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: Profile | null
  /** Session restore finished (getSession). Login UI should not wait for profile. */
  authReady: boolean
  /** True until session is ready and, when logged in, profile has been loaded or skipped. */
  loading: boolean
  /** Teachers can flip this to browse the app from a student's perspective. */
  studentPreviewMode: boolean
  toggleStudentPreview: () => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      const p = data as Profile
      return {
        ...p,
        role: p.role === 'teacher' ? 'teacher' : 'student',
      }
    }
    if (error) {
      console.error('profiles fetch:', error.message)
      return null
    }
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)))
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [studentPreviewMode, setStudentPreviewMode] = useState(false)

  const toggleStudentPreview = useCallback(() => {
    setStudentPreviewMode((prev) => !prev)
  }, [])

  const refreshProfile = useCallback(async () => {
    const uid = user?.id
    if (!uid || !user) {
      setProfile(null)
      return
    }
    let p = await fetchProfile(uid)
    if (!p) {
      await ensureProfileIfMissing(user)
      p = await fetchProfile(uid)
    }
    setProfile(p)
  }, [user])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null)
      setUser(null)
      setAuthReady(true)
      return
    }

    let cancelled = false
    const forceAuthReady = () => {
      if (cancelled) return
      setAuthReady(true)
    }
    const sessionTimeout = window.setTimeout(forceAuthReady, 12_000)

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return
        window.clearTimeout(sessionTimeout)
        setSession(s)
        setUser(s?.user ?? null)
        setAuthReady(true)
      })
      .catch((err) => {
        console.error('getSession:', err)
        window.clearTimeout(sessionTimeout)
        forceAuthReady()
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => {
      cancelled = true
      window.clearTimeout(sessionTimeout)
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady) return

    if (!user?.id) {
      setProfile(null)
      setProfileReady(true)
      return
    }

    const currentUser = user
    let cancelled = false
    setProfileReady(false)
    ;(async () => {
      let p = await fetchProfile(currentUser.id)
      if (cancelled) return
      if (!p) {
        await ensureProfileIfMissing(currentUser)
        if (cancelled) return
        p = await fetchProfile(currentUser.id)
      }
      if (cancelled) return
      setProfile(p)
      setProfileReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user?.id])

  /** When WP changes after a teacher approves a skill, refresh without reloading the page. */
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return

    const channel = supabase
      .channel(`profiles-wp-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          void refreshProfile()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, refreshProfile])

  const loading = !authReady || !profileReady

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) {
      console.error('Google sign-in:', error.message)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    setProfile(null)
    if (!isSupabaseConfigured) {
      setSession(null)
      setUser(null)
      navigate('/login', { replace: true })
      return
    }
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      console.error('Sign out (global):', error.message)
      const { error: localErr } = await supabase.auth.signOut({ scope: 'local' })
      if (localErr) console.error('Sign out (local):', localErr.message)
    }
    navigate('/login', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      authReady,
      loading,
      studentPreviewMode,
      toggleStudentPreview,
      signInWithGoogle,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      authReady,
      loading,
      studentPreviewMode,
      toggleStudentPreview,
      signInWithGoogle,
      signOut,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
