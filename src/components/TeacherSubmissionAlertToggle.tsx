/*
 * Teacher toggle for submission alert banners + chimes (localStorage preference).
 */

import { useEffect, useState } from 'react'
import {
  areTeacherSubmissionAlertsEnabled,
  NOTIFICATION_PREF_EVENT,
  setTeacherSubmissionAlertsEnabled,
} from '../lib/notificationPreferences'

export function TeacherSubmissionAlertToggle() {
  const [enabled, setEnabled] = useState(() => areTeacherSubmissionAlertsEnabled())

  useEffect(() => {
    const sync = () => setEnabled(areTeacherSubmissionAlertsEnabled())
    window.addEventListener(NOTIFICATION_PREF_EVENT, sync)
    return () => window.removeEventListener(NOTIFICATION_PREF_EVENT, sync)
  }, [])

  return (
    <label className="teacher-alert-toggle">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setTeacherSubmissionAlertsEnabled(e.target.checked)}
      />
      <span className="teacher-alert-toggle__label">
        Submission alerts {enabled ? 'on' : 'off'}
      </span>
    </label>
  )
}
