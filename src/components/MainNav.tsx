/*
 * Primary navigation chrome — student hub vs teacher tools
 *
 * Two variants: student links (Workshop, Record, Guilds, Supply, Kit, Field Guide, Dispatch)
 * and a compact teacher strip (Dashboard, Teacher, Reset, Quests, Preview as student).
 * Label map + design rationale: docs/developer-handoff-recent-work.md
 * Mounts `StudentPreviewBanner` above student nav so preview mode is always visible.
 * The yellow “Dev check” strip uses `import.meta.env.DEV` so production students never
 * see port 5173/5174 debugging copy — only developers running Vite locally.
 */

import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { hasNewKitItem, KIT_NEW_ITEM_EVENT } from '../lib/kitNotification'
import { isTeacherProfile } from '../lib/teacher'
import { GuestBrowseBanner } from './GuestBrowseBanner'
import { StudentPreviewBanner } from './StudentPreviewBanner'

type MainNavProps = {
  /** Teacher-facing pages use Dashboard + Teacher; student pages use Home + Skills. */
  variant?: 'student' | 'teacher'
}

export function MainNav({ variant = 'student' }: MainNavProps) {
  const { profile, studentPreviewMode, toggleStudentPreview } = useAuth()
  const navigate = useNavigate()
  const teacher = isTeacherProfile(profile)
  const [kitHasNewItem, setKitHasNewItem] = useState(() => hasNewKitItem())

  useEffect(() => {
    const syncKitBadge = () => setKitHasNewItem(hasNewKitItem())
    window.addEventListener(KIT_NEW_ITEM_EVENT, syncKitBadge)
    window.addEventListener('storage', syncKitBadge)
    return () => {
      window.removeEventListener(KIT_NEW_ITEM_EVENT, syncKitBadge)
      window.removeEventListener('storage', syncKitBadge)
    }
  }, [])

  if (variant === 'teacher') {
    return (
      <div className="student-chrome teacher-chrome">
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
            Teacher
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
          <NavLink
            to="/teacher/beyond"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Beyond
          </NavLink>
          <NavLink
            to="/teacher/learn"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Learn
          </NavLink>
          <NavLink
            to="/teacher/shop"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Shop
          </NavLink>
          <NavLink
            to="/teacher/tools"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Tools
          </NavLink>

          <button
            type="button"
            className="student-nav-link student-nav-link--preview"
            onClick={() => {
              /* Preview uses same Google session; flip flag then land on `/` so student route guards apply. */
              toggleStudentPreview()
              navigate('/', { replace: true })
            }}
          >
            Preview as student
          </button>
        </nav>
      </div>
    )
  }

  return (
    <div className="student-chrome">
      {/* Dev-only: students on production never see this — avoids “where did Journey go?” confusion when the wrong localhost tab is open. */}
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
          <strong>Dev check:</strong> You should see <strong>Journey</strong> and <strong>Skills</strong> in the nav below.
          If not, you are on the <strong>wrong port or an old Vite process</strong>{' '}
          — open the exact <code style={{ opacity: 0.95 }}>Local:</code> URL from the terminal (often{' '}
          <code style={{ opacity: 0.95 }}>:5174</code> if <code style={{ opacity: 0.95 }}>:5173</code> is busy). Clearing
          cookies does not update JS.
        </div>
      ) : null}
      <StudentPreviewBanner />
      <GuestBrowseBanner />
      <nav className="student-nav" aria-label="Main navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Workshop
        </NavLink>
        <NavLink
          to="/journey"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Record
        </NavLink>
        <NavLink
          to="/tree"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Guilds
        </NavLink>
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Supply
        </NavLink>
        <NavLink
          to="/inventory"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          <span className="student-nav-link__label">Kit</span>
          {kitHasNewItem ? <span className="student-nav-link__dot" aria-label="New item in Kit" /> : null}
        </NavLink>
        <NavLink
          to="/resources"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Field Guide
        </NavLink>
        <NavLink
          to="/powerups"
          className={({ isActive }) =>
            `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
          }
        >
          Dispatch
        </NavLink>
        {teacher && !studentPreviewMode ? (
          /* Teachers keep a quick escape hatch to approvals without memorizing `/teacher`. Hidden during student preview to reduce clutter. */
          <NavLink
            to="/teacher"
            className={({ isActive }) =>
              `student-nav-link${isActive ? ' student-nav-link--active' : ''}`
            }
          >
            Teacher
          </NavLink>
        ) : null}
      </nav>
    </div>
  )
}
