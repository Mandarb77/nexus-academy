/*
 * Students only: after one class period with no input, sign out this laptop.
 * Stops JWT refresh and leftover polling from idle Macs / ThinkPads / Chromebooks.
 */

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  idleMs,
  installIdleListeners,
  onIdleWake,
  STUDENT_IDLE_LOGOUT_MS,
  STUDENT_IDLE_QUIET_MS,
  touchIdleClock,
} from '../lib/idleSession'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { isTeacherProfile } from '../lib/teacher'

export function StudentIdleSession() {
  const { user, profile, studentPreviewMode, signOut } = useAuth()
  const { pathname } = useLocation()
  const studentSeat =
    Boolean(user?.id) &&
    profile?.role === 'student' &&
    !studentPreviewMode &&
    !isTeacherProfile(profile)
  const kiosk = pathname.startsWith('/cleanup')

  const loggingOut = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !studentSeat || kiosk) return

    loggingOut.current = false
    touchIdleClock()
    void supabase.auth.startAutoRefresh()

    installIdleListeners()
    const stopWake = onIdleWake(() => {
      void supabase.auth.startAutoRefresh()
    })

    const tick = window.setInterval(() => {
      const idle = idleMs()
      if (idle >= STUDENT_IDLE_QUIET_MS) {
        void supabase.auth.stopAutoRefresh()
      }
      if (idle >= STUDENT_IDLE_LOGOUT_MS && !loggingOut.current) {
        loggingOut.current = true
        void signOut({ idle: true })
      }
    }, 15_000)

    return () => {
      window.clearInterval(tick)
      stopWake()
    }
  }, [studentSeat, kiosk, signOut])

  return null
}
