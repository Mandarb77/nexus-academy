import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'
import { StudentPreviewBanner } from './StudentPreviewBanner'

type MainNavProps = {
  /** Teacher-facing pages use Dashboard + Teacher panel; student pages use Home + Skill tree. */
  variant?: 'student' | 'teacher'
}

export function MainNav({ variant = 'student' }: MainNavProps) {
  const { profile, studentPreviewMode, toggleStudentPreview } = useAuth()
  const navigate = useNavigate()
  const teacher = isTeacherProfile(profile)

  if (variant === 'teacher') {
    return (
      <>
        <nav className="student-nav" aria-label="Teacher navigation">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/teacher"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Teacher panel
          </NavLink>
          <NavLink
            to="/teacher/reset"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Reset
          </NavLink>
          <NavLink
            to="/teacher/quests"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Quests
          </NavLink>

          <button
            type="button"
            className="student-nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ca8a04', fontWeight: 700 }}
            onClick={() => {
              toggleStudentPreview()
              navigate('/', { replace: true })
            }}
          >
            👁 Preview as student
          </button>
        </nav>
      </>
    )
  }

  return (
    <div className="student-chrome">
      {import.meta.env.DEV ? (
        <div
          className="nexus-dev-server-hint"
          role="status"
          style={{
            fontSize: '0.78rem',
            lineHeight: 1.35,
            marginBottom: '0.65rem',
            padding: '0.45rem 0.65rem',
            borderRadius: 8,
            background: 'rgba(234, 179, 8, 0.18)',
            border: '1px solid rgba(234, 179, 8, 0.45)',
            color: '#fcd34d',
          }}
        >
          <strong>Dev check:</strong> You should see <strong>Codex</strong> and <strong>Journey</strong> in the nav below.
          If not, you are on the <strong>wrong port or an old Vite process</strong>{' '}
          — open the exact <code style={{ opacity: 0.95 }}>Local:</code> URL from the terminal (often{' '}
          <code style={{ opacity: 0.95 }}>:5174</code> if <code style={{ opacity: 0.95 }}>:5173</code> is busy). Clearing
          cookies does not update JS.
        </div>
      ) : null}
      <StudentPreviewBanner />
      <nav className="student-nav" aria-label="Main navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/codex"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Codex
        </NavLink>
        <NavLink
          to="/journey"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Journey
        </NavLink>
        <NavLink
          to="/tree"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Skill tree
        </NavLink>
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Shop
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Inventory
        </NavLink>
        <NavLink
          to="/resources"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Resources
        </NavLink>
        <NavLink
          to="/powerups"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Power Ups
        </NavLink>
        {teacher && !studentPreviewMode ? (
          <NavLink
            to="/teacher"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Teacher panel
          </NavLink>
        ) : null}
      </nav>
    </div>
  )
}
