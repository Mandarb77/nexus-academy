import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { HomeRoute } from './components/HomeRoute'
import { StudentOnlyRoute } from './components/StudentOnlyRoute'
import { TeacherDashboardRoute } from './components/TeacherDashboardRoute'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { GoldShopPage } from './pages/GoldShopPage'
import { InventoryPage } from './pages/InventoryPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { PowerUpsPage } from './pages/PowerUpsPage'
import { GuildSkillTreePage } from './pages/GuildSkillTreePage'
import { SkillTreePage } from './pages/SkillTreePage'
import { TeacherPanelPage } from './pages/TeacherPanelPage'
import { TeacherResetPage } from './pages/TeacherResetPage'
import { TeacherQuestsPage } from './pages/TeacherQuestsPage'
import { PatentGamePiecePage } from './pages/PatentGamePiecePage'
import { PatentStickerPage } from './pages/PatentStickerPage'
import { PatentCustomPage } from './pages/PatentCustomPage'
import { JoinPage } from './pages/JoinPage'
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
          <Route
            path="/tree/:guildSlug"
            element={
              <StudentOnlyRoute>
                <GuildSkillTreePage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/shop"
            element={
              <StudentOnlyRoute>
                <GoldShopPage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <StudentOnlyRoute>
                <InventoryPage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/resources"
            element={
              <StudentOnlyRoute>
                <ResourcesPage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/powerups"
            element={
              <StudentOnlyRoute>
                <PowerUpsPage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/patent-game-piece/:tileId"
            element={
              <StudentOnlyRoute>
                <PatentGamePiecePage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/patent-sticker/:tileId"
            element={
              <StudentOnlyRoute>
                <PatentStickerPage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/patent-custom/:tileId"
            element={
              <StudentOnlyRoute>
                <PatentCustomPage />
              </StudentOnlyRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route
            path="/dashboard"
            element={
              <TeacherDashboardRoute>
                <DashboardPage />
              </TeacherDashboardRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <TeacherDashboardRoute>
                <TeacherPanelPage />
              </TeacherDashboardRoute>
            }
          />
          <Route
            path="/teacher/reset"
            element={
              <TeacherDashboardRoute>
                <TeacherResetPage />
              </TeacherDashboardRoute>
            }
          />
          <Route
            path="/teacher/quests"
            element={
              <TeacherDashboardRoute>
                <TeacherQuestsPage />
              </TeacherDashboardRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
