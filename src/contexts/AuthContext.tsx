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
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { beginGoogleOAuthStart, clearGoogleOAuthStart } from '../lib/pkceVerifierBackup'
import { SCHOOL_EMAIL_DOMAIN } from '../lib/schoolEmail'
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
        preferred_first_name: p.preferred_first_name?.trim() || null,
        /* Defensive normalize: DB could theoretically hold unexpected strings; routing only cares about teacher vs not. */
        role: p.role === 'teacher' ? 'teacher' : 'student',
      }
    }
    if (error) {
      console.error('profiles fetch:', error.message)
      return null
    }
    /* Backoff gives Supabase triggers / RLS a moment to finish creating the profile row after OAuth. */
    await new Promise((r) => setTimeout(r, 350 * (attempt + 1)))
  }
  return null
}

// -----------------------------------------------------------------------------
// AuthProvider — React state, Supabase effects, Google OAuth, context value
// -----------------------------------------------------------------------------

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
      setProfile((prev) => (prev ? { ...prev, preferred_first_name: cleaned } : prev))
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
    } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') {
        void supabase.auth.getSession().then(({ data: { session: restored } }) => {
          if (cancelled) return
          if (restored) {
            setSession(restored)
            setUser(restored.user)
            return
          }
          setSession(null)
          setUser(null)
        })
        return
      }
      setSession(s)
      setUser(s?.user ?? null)
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
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }
    if (!beginGoogleOAuthStart()) return false
    const redirectTo = `${window.location.origin}/auth/callback`
    /*
     * Preview testing: Supabase must allow `https://*.vercel.app/auth/callback` or sign-in
     * returns to production Site URL and the Preview bundle (proto env vars) is skipped.
     */
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
            hd: SCHOOL_EMAIL_DOMAIN,
          },
        },
      })
      if (error) {
        clearGoogleOAuthStart()
        console.error('Google sign-in:', error.message)
        throw error
      }
      return true
    } catch (err) {
      clearGoogleOAuthStart()
      throw err
    }
  }, [])

  const switchToSchoolGoogleAccount = useCallback(async () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured')
    }
    /* The just-finished (wrong-account) login still holds the start lock. */
    clearGoogleOAuthStart()
    return signInWithGoogle()
  }, [signInWithGoogle])

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
