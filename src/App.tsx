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
import { JourneyPage } from './pages/JourneyPage'
import { CodexPage } from './pages/CodexPage'
import { GuildSkillTreePage } from './pages/GuildSkillTreePage'
import { SkillTreePage } from './pages/SkillTreePage'
import { TeacherPanelPage } from './pages/TeacherPanelPage'
import { TeacherResetPage } from './pages/TeacherResetPage'
import { TeacherQuestsPage } from './pages/TeacherQuestsPage'
import { PatentGamePiecePage } from './pages/PatentGamePiecePage'
import { PatentStickerPage } from './pages/PatentStickerPage'
import { PatentCustomPage } from './pages/PatentCustomPage'
import { JoinPage } from './pages/JoinPage'
import { ApprovalCelebrationSync } from './components/ApprovalCelebrationSync'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      {import.meta.env.DEV && (
        <div className="nexus-app-dev-ribbon" role="note">
          Local dev — if this bar is missing, you are not on this repo’s Vite server.{' '}
          <a href="/nexus-dev-verify.txt" target="_blank" rel="noopener noreferrer">
            Open /nexus-dev-verify.txt
          </a>{' '}
          (first line must be <code>nexus-academy-repo-ok</code>). Power Ups section pills only appear on the Power Ups tab.
        </div>
      )}
      <AuthProvider>
        <ApprovalCelebrationSync />
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
            path="/journey"
            element={
              <StudentOnlyRoute>
                <JourneyPage />
              </StudentOnlyRoute>
            }
          />
          <Route
            path="/codex"
            element={
              <StudentOnlyRoute>
                <CodexPage />
              </StudentOnlyRoute>
            }
          />
          <Route path="/portfolio" element={<Navigate to="/codex" replace />} />
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
