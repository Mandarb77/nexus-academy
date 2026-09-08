/*
 * GoTrue session copy that SIGNED_OUT cannot wipe, **this tab only**.
 *
 * A 504 on refresh fires SIGNED_OUT and clears supabase-js sessionStorage.
 * We keep our own copy in sessionStorage (not localStorage) so a hard refresh
 * in this tab can restore, but the next student on a shared Chromebook does
 * not inherit a teacher session and lose Workshop.
 */

import type { Session, User } from '@supabase/supabase-js'

const KEY = 'nexus:session-backup'

type SessionBackup = {
  access_token: string
  refresh_token: string
  user: User
  expires_at?: number
  expires_in?: number
  token_type?: string
}

function purgeLegacyLocalBackup(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function readSessionBackup(): Session | null {
  purgeLegacyLocalBackup()
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const row = parsed as SessionBackup
    if (!row.access_token || !row.refresh_token || !row.user?.id) return null
    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      user: row.user,
      expires_at: row.expires_at,
      expires_in: row.expires_in ?? 0,
      token_type: 'bearer',
    }
  } catch {
    return null
  }
}

export function writeSessionBackup(session: Session | null): void {
  if (!session?.access_token || !session.refresh_token || !session.user) return
  purgeLegacyLocalBackup()
  try {
    const payload: SessionBackup = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
    }
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionBackup(): void {
  purgeLegacyLocalBackup()
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
