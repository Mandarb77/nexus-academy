/*
 * Synthesized cleanup kiosk sounds — no audio files.
 *
 * Dice roll: ~900ms of rapid clicks. Ding: short two-tone on each pairing reveal.
 * Chromium kiosk should launch with `--autoplay-policy=no-user-gesture-required`
 * so the Pi does not need a tap. `unlockCleanupAudio` is the fallback.
 */

const DICE_ROLL_SECONDS = 0.9

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!sharedCtx) sharedCtx = new Ctx()
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume()
  }
  return sharedCtx
}

export async function unlockCleanupAudio(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return false
    }
  }
  return ctx.state === 'running'
}

export function isCleanupAudioUnlocked(): boolean {
  return sharedCtx?.state === 'running'
}

function playClick(ctx: AudioContext, startAt: number, frequency: number, duration: number, gainPeak: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
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
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.04)
}

/** Rapid dice-like clicks lasting ~900ms. */
export function playDiceRollSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  const t0 = ctx.currentTime
  const clicks = 20
  for (let i = 0; i < clicks; i++) {
    const t = t0 + (i / clicks) * DICE_ROLL_SECONDS
    const freq = 980 + (i % 5) * 90 + (i % 2) * 40
    playClick(ctx, t, freq, 0.028, 0.07)
  }
}

/** Short ding when a student → job row appears. */
export function playRevealDing() {
  const ctx = getAudioContext()
  if (!ctx) return
  const t = ctx.currentTime
  playTone(ctx, 1318.51, t, 0.11, 0.14)
  playTone(ctx, 1760, t + 0.035, 0.1, 0.09)
}

export const CLEANUP_DICE_MS = 900
export const CLEANUP_REVEAL_GAP_MS = 500
