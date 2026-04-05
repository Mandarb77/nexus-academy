import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

/**
 * Sticky banner shown to teachers who are browsing in student-preview mode.
 * Renders nothing for students or when preview mode is off.
 */
export function StudentPreviewBanner() {
  const { profile, studentPreviewMode, toggleStudentPreview } = useAuth()
  const navigate = useNavigate()

  if (!isTeacherProfile(profile) || !studentPreviewMode) return null

  const exitPreview = () => {
    toggleStudentPreview()
    navigate('/dashboard', { replace: true })
  }

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.55rem 1.25rem',
        background: 'rgba(234,179,8,0.92)',
        backdropFilter: 'blur(6px)',
        color: '#1c1000',
        fontWeight: 600,
        fontSize: '0.9rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span>👁 Student preview — you are seeing the app as a student would</span>
      <button
        type="button"
        onClick={exitPreview}
        style={{
          background: 'rgba(0,0,0,0.15)',
          border: 'none',
          borderRadius: '6px',
          padding: '0.3rem 0.85rem',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer',
          color: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        Exit preview →
      </button>
    </div>
  )
}
