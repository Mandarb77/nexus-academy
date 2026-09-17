/*
 * After a Vercel deploy, personal laptops still running the previous bundle pick up
 * the new one the next time the tab is visible and the student is not mid-type.
 * No lab-wide hard refresh.
 */

import { idleMs, installIdleListeners } from './idleSession'

const META = 'nexus-build-id'
const CHECK_MS = 4 * 60 * 1000
const QUIET_BEFORE_RELOAD_MS = 45_000

function localBuildId(): string {
  return document.querySelector(`meta[name="${META}"]`)?.getAttribute('content')?.trim() ?? ''
}

async function remoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/nexus-build.txt?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const text = (await res.text()).trim()
    return text || null
  } catch {
    return null
  }
}

async function reloadIfStale(): Promise<void> {
  const mine = localBuildId()
  if (!mine) return
  if (document.hidden) return
  if (idleMs() < QUIET_BEFORE_RELOAD_MS) return
  const remote = await remoteBuildId()
  if (!remote || remote === mine) return
  window.location.reload()
}

export function watchForNewDeploy(): void {
  if (import.meta.env.DEV) return
  if (window.location.pathname.startsWith('/cleanup')) return
  installIdleListeners()
  const run = () => {
    void reloadIfStale()
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) run()
  })
  window.addEventListener('pageshow', run)
  window.setInterval(run, CHECK_MS)
}
