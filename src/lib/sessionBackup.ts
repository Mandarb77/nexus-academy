/*
 * GoTrue session copy that SIGNED_OUT cannot wipe.
 *
 * Auth tokens live in sessionStorage. A 504 on refresh fires SIGNED_OUT and
 * clears that store. After a hard refresh the in-memory restore is gone and
 * the teacher looks logged out even though Google never revoked them.
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

export function readSessionBackup(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
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
  try {
    const payload: SessionBackup = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: session.user,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
    }
    localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionBackup(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
