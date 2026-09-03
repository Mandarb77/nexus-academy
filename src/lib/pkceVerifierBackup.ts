/*
 * PKCE safety net for double-clicks / two tabs.
 *
 * supabase-js stores one code verifier. A second signInWithOAuth overwrites it, so
 * the first Google return cannot be exchanged. We keep the last few verifiers and
 * retry them if the live exchange fails.
 */

const BACKUP_KEY = 'nexus:pkce-verifier-backups'
const MAX_BACKUPS = 5

function isVerifierKey(key: string): boolean {
  return key.endsWith('-code-verifier')
}

function readBackups(): string[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
  } catch {
    return []
  }
}

function pushBackup(value: string) {
  const next = [value, ...readBackups().filter((item) => item !== value)].slice(0, MAX_BACKUPS)
  localStorage.setItem(BACKUP_KEY, JSON.stringify(next))
}

export function createPkceBackupStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const probe = 'nexus:ls-probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
  } catch {
    return undefined
  }

  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => {
      localStorage.setItem(key, value)
      if (isVerifierKey(key) && value) pushBackup(value)
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key)
    },
  }
}

export async function exchangeCodeWithPkceBackups(
  exchange: (code: string) => Promise<{ data: { session: unknown } | null; error: { message: string } | null }>,
  code: string,
  verifierStorageKey: string,
): Promise<{ data: { session: unknown } | null; error: { message: string } | null }> {
  const current = (() => {
    try {
      return localStorage.getItem(verifierStorageKey)
    } catch {
      return null
    }
  })()

  const candidates: string[] = []
  if (current) candidates.push(current)
  for (const backup of readBackups()) {
    if (!candidates.includes(backup)) candidates.push(backup)
  }

  let last: { data: { session: unknown } | null; error: { message: string } | null } = {
    data: { session: null },
    error: { message: 'Sign-in did not finish.' },
  }

  for (const verifier of candidates) {
    try {
      localStorage.setItem(verifierStorageKey, verifier)
    } catch {
      continue
    }
    last = await exchange(code)
    if (!last.error) return last
  }
  return last
}

export function pkceVerifierStorageKey(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname.split('.')[0] ?? 'placeholder'
  return `sb-${host}-auth-token-code-verifier`
}

const START_LOCK_KEY = 'nexus:oauth-start-lock'
const START_LOCK_MS = 45_000

let memoryLockUntil = 0

/** False if another tab (or a double-click) already started Google OAuth recently. */
export function beginGoogleOAuthStart(): boolean {
  const now = Date.now()
  if (now < memoryLockUntil) return false
  try {
    const raw = localStorage.getItem(START_LOCK_KEY)
    const startedAt = raw ? Number(raw) : 0
    if (Number.isFinite(startedAt) && now - startedAt < START_LOCK_MS) {
      return false
    }
    localStorage.setItem(START_LOCK_KEY, String(now))
  } catch {
    /* private mode — memory lock still holds this tab */
  }
  memoryLockUntil = now + START_LOCK_MS
  return true
}

export function clearGoogleOAuthStart(): void {
  memoryLockUntil = 0
  try {
    localStorage.removeItem(START_LOCK_KEY)
  } catch {
    /* ignore */
  }
}
