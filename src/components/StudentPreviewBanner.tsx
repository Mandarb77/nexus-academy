/*
 * Teacher UX: visible reminder when browsing as a student
 *
 * When a teacher toggles student preview in the dashboard, they navigate student routes
 * with full auth still as teacher — this sticky bar prevents mistaken grading assumptions
 * (“why is gold wrong?”) and gives a one-click exit back to `/dashboard`. Renders null
 * for real students so it never consumes vertical space in class.
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

export function StudentPreviewBanner() {
  const { profile, studentPreviewMode, toggleStudentPreview } = useAuth()
  const navigate = useNavigate()

  if (!isTeacherProfile(profile) || !studentPreviewMode) return null

  const exitPreview = () => {
    toggleStudentPreview()
    /* Replace so the student stack is not preserved in history — reduces accidental “back” into preview. */
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="bench-preview-banner" role="status">
      <span className="bench-preview-banner__text">
        Student preview — you are seeing the app as a student would
      </span>
      <button type="button" className="bench-preview-banner__exit" onClick={exitPreview}>
        Exit preview →
      </button>
    </div>
  )
}
