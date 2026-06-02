/*
 * Short UI chimes via Web Audio — no asset files.
 * Browsers may block audio until the user has interacted with the page; we resume the context on play.
 */

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume()
  }
  return sharedCtx
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  gainPeak: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.05)
}

/** Student: quest approved — warm ascending chime. */
export function playApprovalChime() {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  playTone(ctx, 523.25, t, 0.18, 0.14)
  playTone(ctx, 659.25, t + 0.14, 0.22, 0.16)
  playTone(ctx, 783.99, t + 0.3, 0.28, 0.12)
}

/** Teacher: new submission in queue — distinct two-tone alert. */
export function playSubmissionAlertChime() {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  playTone(ctx, 880, t, 0.12, 0.13)
  playTone(ctx, 698.46, t + 0.16, 0.2, 0.14)
  playTone(ctx, 880, t + 0.34, 0.18, 0.11)
}
