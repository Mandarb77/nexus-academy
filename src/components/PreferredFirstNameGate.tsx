/*
 * Preferred first name gate (global overlay)
 *
 * Why: Fran/Barry shop voice and the Workshop welcome used Google `display_name`,
 * which is often a full legal/roster name. Students pick a first name once; it
 * lives on `profiles.preferred_first_name` (migration 20260708120000).
 *
 * Mounted once in App.tsx so every signed-in student route is blocked until set.
 * Teachers skip the gate unless they are in student preview (then they use the
 * previewed student profile, which may already have a name). Cleanup kiosk
 * routes (`/cleanup`) skip it so the Pi/laptop pages stay unblocked.
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  needsPreferredFirstName,
  suggestedPreferredFirstName,
} from '../lib/preferredFirstName'
import { isTeacherProfile } from '../lib/teacher'
import { isGuestBrowse } from '../lib/schoolEmail'

export function PreferredFirstNameGate() {
  const { user, profile, loading, studentPreviewMode, updatePreferredFirstName } = useAuth()
  const { pathname } = useLocation()
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const show = Boolean(
    user &&
      profile &&
      !loading &&
      !pathname.startsWith('/cleanup') &&
      needsPreferredFirstName(profile) &&
      /* Teachers only see this while previewing as a student who still lacks a name.
       * Off-domain guests skip it — they cannot save a name, and it would block browsing. */
      !(isTeacherProfile(profile) && !studentPreviewMode) &&
      !isGuestBrowse(user.email ?? profile.email, profile),
  )

  const suggestion = useMemo(() => {
    if (!user || !profile) return ''
    const meta = user.user_metadata
    return suggestedPreferredFirstName({
      preferredFirstName: profile.preferred_first_name,
      displayName: profile.display_name,
      fullNameFromGoogle:
        (typeof meta?.given_name === 'string' && meta.given_name) ||
        (typeof meta?.full_name === 'string' && meta.full_name) ||
        (typeof meta?.name === 'string' && meta.name) ||
        null,
      email: profile.email ?? user.email ?? null,
    })
  }, [user, profile])

  useEffect(() => {
    if (!show) {
      setValue('')
      setError(null)
      return
    }
    setValue(suggestion)
  }, [show, suggestion])

  if (!show) return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await updatePreferredFirstName(value)
    setSaving(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="preferred-name-gate" role="dialog" aria-modal="true" aria-labelledby="preferred-name-title">
      <form className="preferred-name-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="preferred-name-card__eyebrow">Before you head in</p>
        <h2 id="preferred-name-title" className="preferred-name-card__title">
          What should Fran call you?
        </h2>
        <p className="preferred-name-card__body">
          Please input your first name and last initial. This is the name the Academy will use when it speaks to you.
          Some of the people you'll meet here will use it when they talk to you about your progress.
        </p>
        <label className="preferred-name-card__label" htmlFor="preferred-first-name">
          Preferred first name
        </label>
        <input
          id="preferred-first-name"
          className="preferred-name-card__input"
          type="text"
          autoComplete="given-name"
          autoFocus
          maxLength={40}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Mia"
          disabled={saving}
        />
        {error ? (
          <p className="preferred-name-card__error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-primary preferred-name-card__submit" disabled={saving || !value.trim()}>
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
