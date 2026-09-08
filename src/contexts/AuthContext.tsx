/*
 * Authentication and profile context for the whole SPA
 *
 * Wraps Supabase Auth (`getSession`, `onAuthStateChange`) and the `profiles` row
 * (WP, gold, role, display name, preferred_first_name). Student pages read `profile`
 * for economy state; teacher pages use `role`. `updatePreferredFirstName` persists the
 * Fran-voice name collected by PreferredFirstNameGate. `refreshProfile` is called after
 * skill approvals and from a Realtime listener on the signed-in user’s profile
 * (`profiles` is in `supabase_realtime`) so WP/gold appear without a full reload.
 * `studentPreviewMode` lets
 * teachers walk the student UI without losing their session. Retries in `fetchProfile`
 * exist because right after Google OAuth the row can lag briefly behind the session.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { startGoogleOAuth } from '../lib/googleSignIn'
import { profileForUi, readCachedProfile, writeCachedProfile } from '../lib/profileCache'
import { clearSessionBackup, readSessionBackup, writeSessionBackup } from '../lib/sessionBackup'
import type { Profile } from '../types/profile'

// -----------------------------------------------------------------------------
// Module helpers — profile row shape, first-time insert, fetch with backoff
// -----------------------------------------------------------------------------

/* Narrow select keeps payload small and ignores legacy DB columns that the app no longer surfaces. */
const PROFILE_COLUMNS =
  'id, email, display_name, preferred_first_name, wp, gold, role, portfolio_quote' as const

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
    role: 'student',
  })
  /* Race on first login: two tabs or retry can insert twice — 23505 is unique violation, safe to ignore. */
  if (error && error.code !== '23505') {
    console.error('ensure profile:', error.message)
  }
}

// -----------------------------------------------------------------------------
// Context contract + `createContext` (used by `useAuth` at bottom of file)
// -----------------------------------------------------------------------------

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
  /** True if this call started Google OAuth; false if a start is already in flight. */
  signInWithGoogle: () => Promise<boolean>
  /** Sign out of a personal Gmail and reopen Google so they can pick @kentshill.org. */
  switchToSchoolGoogleAccount: () => Promise<boolean>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  /** Persist preferred first name (Fran/Barry voice + welcome). */
  updatePreferredFirstName: (name: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

type ProfileFetch = { kind: 'ok'; profile: Profile } | { kind: 'missing' } | { kind: 'timeout' }

function isAbortError(error: { name?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.name === 'AbortError' || /abort|timeout|504|deadline/i.test(error.message ?? '')
}

async function fetchProfile(userId: string): Promise<ProfileFetch> {
  let timedOut = false
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const abortTimer = window.setTimeout(() => controller.abort(), 5_000)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle()

      if (data) {
        const p = data as Profile
        return {
          kind: 'ok',
          profile: {
            ...p,
            preferred_first_name: p.preferred_first_name?.trim() || null,
            role: p.role === 'teacher' ? 'teacher' : 'student',
          },
        }
      }
      if (isAbortError(error)) {
        timedOut = true
      } else if (error) {
        console.error('profiles fetch:', error.message)
        timedOut = true
      } else {
        return { kind: 'missing' }
      }
    } catch (err) {
      timedOut = true
      console.error('profiles fetch:', err)
    } finally {
      window.clearTimeout(abortTimer)
    }
    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
  }
  return timedOut ? { kind: 'timeout' } : { kind: 'missing' }
}

// -----------------------------------------------------------------------------
// AuthProvider — React state, Supabase effects, Google OAuth, context value
// -----------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(() => readSessionBackup())
  const [user, setUser] = useState<User | null>(() => readSessionBackup()?.user ?? null)
  const [profile, setProfile] = useState<Profile | null>(() => {
    const uid = readSessionBackup()?.user?.id
    return uid ? readCachedProfile(uid) : null
  })
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [studentPreviewMode, setStudentPreviewMode] = useState(false)
  const userSignedOutRef = useRef(false)
  const lastGoodSessionRef = useRef<Session | null>(readSessionBackup())
  const lastRestoreAtRef = useRef(0)

  const toggleStudentPreview = useCallback(() => {
    setStudentPreviewMode((prev) => !prev)
  }, [])

  const refreshProfile = useCallback(async () => {
    const uid = user?.id
    if (!uid || !user) {
      setProfile(null)
      return
    }
    let p: Profile | null = null
    const result = await fetchProfile(uid)
    if (result.kind === 'ok') p = result.profile
    else if (result.kind === 'missing') {
      await ensureProfileIfMissing(user)
      const again = await fetchProfile(uid)
      if (again.kind === 'ok') p = again.profile
    }
    const next = profileForUi(uid, p)
    if (next) setProfile(next)
  }, [user])

  const updatePreferredFirstName = useCallback(
    async (name: string) => {
      const uid = user?.id
      if (!uid || !isSupabaseConfigured) {
        return { error: 'Not signed in.' }
      }
      const cleaned = name.trim().replace(/\s+/g, ' ')
      if (!cleaned) return { error: 'Enter a first name.' }
      if (cleaned.length > 40) return { error: 'Keep it under 40 characters.' }
      if (!/^[A-Za-z][A-Za-z'\- ]{0,38}[A-Za-z]?$/.test(cleaned)) {
        return { error: 'Use letters only (hyphens and apostrophes are fine).' }
      }
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_first_name: cleaned })
        .eq('id', uid)
      if (error) {
        console.error('preferred_first_name update:', error.message)
        return { error: error.message }
      }
      setProfile((prev) => {
        if (!prev) return prev
        const next = { ...prev, preferred_first_name: cleaned }
        writeCachedProfile(next)
        return next
      })
      return { error: null }
    },
    [user?.id],
  )

  // --- Effect: restore Supabase session + subscribe to auth changes ---
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
    /* Failsafe: never leave the app stuck on “Checking session…” if getSession hangs on a bad network. */
    const sessionTimeout = window.setTimeout(forceAuthReady, 5_000)

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return
        window.clearTimeout(sessionTimeout)
        if (s?.user) {
          lastGoodSessionRef.current = s
          writeSessionBackup(s)
          setSession(s)
          setUser(s.user)
        } else {
          const held = lastGoodSessionRef.current ?? readSessionBackup()
          if (held?.user) {
            lastGoodSessionRef.current = held
            setSession(held)
            setUser(held.user)
          } else {
            setSession(null)
            setUser(null)
          }
        }
        setAuthReady(true)
      })
      .catch((err) => {
        console.error('getSession:', err)
        window.clearTimeout(sessionTimeout)
        forceAuthReady()
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (!s?.user) {
        if (userSignedOutRef.current) {
          lastGoodSessionRef.current = null
          clearSessionBackup()
          setSession(null)
          setUser(null)
          return
        }
        /* A 504 on token refresh looks like sign-out. Keep this tab signed in unless they clicked Sign out. */
        const held = lastGoodSessionRef.current ?? readSessionBackup()
        if (held?.access_token && held.refresh_token) {
          lastGoodSessionRef.current = held
          writeSessionBackup(held)
          setSession(held)
          setUser(held.user)
          if (event === 'SIGNED_OUT' && Date.now() - lastRestoreAtRef.current > 5_000) {
            lastRestoreAtRef.current = Date.now()
            void supabase.auth.setSession({
              access_token: held.access_token,
              refresh_token: held.refresh_token,
            })
          }
          return
        }
        setSession(null)
        setUser(null)
        return
      }

      lastGoodSessionRef.current = s
      writeSessionBackup(s)
      setSession(s)
      setUser(s.user)
    })

    return () => {
      cancelled = true
      window.clearTimeout(sessionTimeout)
      subscription.unsubscribe()
    }
  }, [])

  // --- Effect: load `profiles` row (or insert default) once session user is known ---
  useEffect(() => {
    if (!authReady) return

    if (!user?.id) {
      setProfile(null)
      setProfileReady(true)
      return
    }

    const currentUser = user
    let cancelled = false
    const cached = readCachedProfile(currentUser.id)
    if (cached) setProfile(cached)
    setProfileReady(Boolean(cached))
    const unblock = window.setTimeout(() => {
      if (cancelled) return
      const cached = readCachedProfile(currentUser.id)
      setProfile((prev) => prev ?? cached)
      setProfileReady(true)
    }, 8_000)
    ;(async () => {
      const result = await fetchProfile(currentUser.id)
      if (cancelled) return
      let fetched: Profile | null = null
      if (result.kind === 'ok') {
        fetched = result.profile
      } else if (result.kind === 'missing') {
        await ensureProfileIfMissing(currentUser)
        if (cancelled) return
        const again = await fetchProfile(currentUser.id)
        if (again.kind === 'ok') fetched = again.profile
      }
      if (cancelled) return
      window.clearTimeout(unblock)
      const next = profileForUi(currentUser.id, fetched)
      if (next) setProfile(next)
      setProfileReady(true)
    })()
    return () => {
      cancelled = true
      window.clearTimeout(unblock)
    }
  }, [authReady, user?.id])

  // --- Effect: Realtime on own profile — refresh WP/gold without full page reload ---
  /*
   * When WP changes after a teacher approves a skill (or other server-side profile
   * update), pull the latest row without a full page reload — keeps header/student
   * home in sync with the database.
   */
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

  // --- Actions: Google OAuth + sign out (navigate to /login) ---
  const signInWithGoogle = useCallback(async () => {
    await startGoogleOAuth()
    return true
  }, [])

  const switchToSchoolGoogleAccount = useCallback(async () => {
    return signInWithGoogle()
  }, [signInWithGoogle])

  const signOut = useCallback(async () => {
    userSignedOutRef.current = true
    lastGoodSessionRef.current = null
    clearSessionBackup()
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

  // --- Memoize context value (avoid rerendering whole tree on unrelated parent updates) ---
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
      switchToSchoolGoogleAccount,
      signOut,
      refreshProfile,
      updatePreferredFirstName,
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
      switchToSchoolGoogleAccount,
      signOut,
      refreshProfile,
      updatePreferredFirstName,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// -----------------------------------------------------------------------------
// `useAuth` — read session/profile from any component under `<AuthProvider>`
// -----------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
