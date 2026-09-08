/*
 * Last-known `profiles` row (localStorage so a hard refresh still has teacher role).
 *
 * Profile GET 504s used to invent a student stub, which hid teacher nav even though
 * `profiles.role` was still teacher in Postgres. Restore the cached row until a real
 * fetch succeeds.
 */

import type { Profile } from '../types/profile'

function cacheKey(userId: string): string {
  return `nexus:profile-cache:${userId}`
}

export function readCachedProfile(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const row = parsed as Profile
    if (row.id !== userId) return null
    return {
      ...row,
      role: row.role === 'teacher' ? 'teacher' : 'student',
    }
  } catch {
    return null
  }
}

export function writeCachedProfile(profile: Profile): void {
  try {
    localStorage.setItem(cacheKey(profile.id), JSON.stringify(profile))
  } catch {
    /* quota / private mode */
  }
}

export function profileForUi(userId: string, fetched: Profile | null): Profile | null {
  if (fetched) {
    writeCachedProfile(fetched)
    return fetched
  }
  return readCachedProfile(userId)
}
