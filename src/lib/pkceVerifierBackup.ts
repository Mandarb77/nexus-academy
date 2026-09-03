/*
 * PKCE safety net for double-clicks / two tabs.
 *
 * supabase-js stores one code verifier. A second signInWithOAuth overwrites it, so
 * the first Google return cannot be exchanged. We keep the last few verifiers and
 * retry them if the live exchange fails.
 *
 * Auth tokens live in sessionStorage (this tab only). Classroom Chromebooks often
 * keep extra Nexus tabs; an old tab refreshing a stale token used to wipe
 * localStorage and bounce the new login back to Google. sessionStorage stops that.
 * Verifier backups still go to localStorage so a second tab can finish the first click.
 */

const BACKUP_KEY = 'nexus:pkce-verifier-backups'
const MAX_BACKUPS = 5

function isVerifierKey(key: string): boolean {
  return key.endsWith('-code-verifier')
}

function probeStorage(store: Storage, probeKey: string): boolean {
  try {
    store.setItem(probeKey, '1')
    store.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

/** Tab-local store for the auth session; localStorage only if sessionStorage is blocked. */
function primaryAuthStore(): Storage | null {
  if (typeof window === 'undefined') return null
  if (probeStorage(sessionStorage, 'nexus:ss-probe')) return sessionStorage
  if (probeStorage(localStorage, 'nexus:ls-probe')) return localStorage
  return null
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
  try {
    const next = [value, ...readBackups().filter((item) => item !== value)].slice(0, MAX_BACKUPS)
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function createPkceBackupStorage(): {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} | undefined {
  const store = primaryAuthStore()
  if (!store) return undefined

  return {
    getItem: (key: string) => store.getItem(key),
    setItem: (key: string, value: string) => {
      store.setItem(key, value)
      if (isVerifierKey(key) && value) pushBackup(value)
    },
    removeItem: (key: string) => {
      store.removeItem(key)
    },
  }
}

export async function exchangeCodeWithPkceBackups(
  exchange: (code: string) => Promise<{ data: { session: unknown } | null; error: { message: string } | null }>,
  code: string,
  verifierStorageKey: string,
): Promise<{ data: { session: unknown } | null; error: { message: string } | null }> {
  const store = primaryAuthStore()
  const current = (() => {
    try {
      return store?.getItem(verifierStorageKey) ?? null
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
    if (!store) break
    try {
      store.setItem(verifierStorageKey, verifier)
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
