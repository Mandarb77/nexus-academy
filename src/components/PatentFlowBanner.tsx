/*
 * Transient status line for multi-step patent flows
 *
 * Surfaces short-lived success/error copy (plan submitted, packet returned, etc.) without
 * modal noise. Auto-dismiss keeps the form readable during long class periods while
 * `aria-live="polite"` announces changes once for assistive tech.
 */

import { useEffect, useRef } from 'react'

type Props = {
  message: string | null
  tone?: 'success' | 'neutral'
  /** Clear message after this many ms (screen readers get one polite announcement). */
  autoClearMs?: number
  onClear?: () => void
}

// -----------------------------------------------------------------------------
// PatentFlowBanner — auto-clearing status strip (patent wizards)
// -----------------------------------------------------------------------------

export function PatentFlowBanner({
  message,
  tone = 'success',
  autoClearMs = 5200,
  onClear,
}: Props) {
  const onClearRef = useRef(onClear)
  onClearRef.current = onClear

  // --- Auto-dismiss: stable `onClear` ref so timeout always calls latest callback ---
  useEffect(() => {
    if (!message || autoClearMs <= 0 || !onClearRef.current) return
    /* Ref avoids stale closure if parent recreates `onClear` each render while timeout is pending. */
    const t = window.setTimeout(() => onClearRef.current?.(), autoClearMs)
    return () => window.clearTimeout(t)
  }, [message, autoClearMs])

  // --- Render ---
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`patent-flow-banner patent-flow-banner--${tone}`}
    >
      {message}
    </div>
  )
}
