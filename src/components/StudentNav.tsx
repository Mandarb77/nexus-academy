import { NavLink } from 'react-router-dom'

export function StudentNav() {
  return (
    <nav className="student-nav" aria-label="Student navigation">
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
    </nav>
  )
}
