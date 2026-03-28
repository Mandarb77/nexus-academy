import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { HomeRoute } from './components/HomeRoute'
import { StudentOnlyRoute } from './components/StudentOnlyRoute'
import { TeacherDashboardRoute } from './components/TeacherDashboardRoute'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SkillTreePage } from './pages/SkillTreePage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route
            path="/tree"
            element={
              <StudentOnlyRoute>
                <SkillTreePage />
              </StudentOnlyRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <TeacherDashboardRoute>
                <DashboardPage />
              </TeacherDashboardRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
