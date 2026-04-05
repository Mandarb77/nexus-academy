import { useEffect, useRef } from 'react'

type Props = {
  message: string | null
  tone?: 'success' | 'neutral'
  /** Clear message after this many ms (screen readers get one polite announcement). */
  autoClearMs?: number
  onClear?: () => void
}

export function PatentFlowBanner({
  message,
  tone = 'success',
  autoClearMs = 5200,
  onClear,
}: Props) {
  const onClearRef = useRef(onClear)
  onClearRef.current = onClear

  useEffect(() => {
    if (!message || autoClearMs <= 0 || !onClearRef.current) return
    const t = window.setTimeout(() => onClearRef.current?.(), autoClearMs)
    return () => window.clearTimeout(t)
  }, [message, autoClearMs])

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
