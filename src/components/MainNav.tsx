import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isTeacherProfile } from '../lib/teacher'

type MainNavProps = {
  /** Teacher-facing pages use Dashboard + Teacher panel; student pages use Home + Skill tree. */
  variant?: 'student' | 'teacher'
}

export function MainNav({ variant = 'student' }: MainNavProps) {
  const { profile } = useAuth()
  const teacher = isTeacherProfile(profile)

  if (variant === 'teacher') {
    return (
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
      </nav>
    )
  }

  return (
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
      {teacher ? (
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
  )
}
