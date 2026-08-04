/*
 * Nexus Academy — application shell and route table
 *
 * Defines every URL the gamified maker-class app serves: student areas (skill trees,
 * gold shop, inventory, journey/codex, patent flows) vs teacher areas (dashboard,
 * approvals, quest tooling, reset). Wraps the tree in `AuthProvider` so any page can
 * read session/profile; mounts global Realtime UX once at the top (no per-page wiring):
 *   - Students: `ApprovalCelebrationHost` + `ApprovalCelebrationSync` (final quest approved → WP/gold toast + chime)
 *     and `StudentReviewAlertHost` + `StudentReviewAlertSync` (plan/checklist/final/shop/redemption approve + deny)
 *   - Teachers: `TeacherSubmissionAlertHost` + `TeacherSubmissionAlertSync` (pending review banner + chime; toggle on Teacher panel)
 *   - Students: `PreferredFirstNameGate` (one-time name for Fran voice; blocks student UI until set)
 * See docs/developer-handoff-recent-work.md for bench chrome vs patent ledger split.
 * The dev-only ribbon (`import.meta.env.DEV`) is
 * intentionally absent in production builds so students never see local-debug hints
 * or the `/nexus-dev-verify.txt` sanity-check link.
 */

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
import { TeacherShopPage } from './pages/TeacherShopPage'
import { TeacherToolGlossaryPage } from './pages/TeacherToolGlossaryPage'
import { TeacherBeyondTilesPage } from './pages/TeacherBeyondTilesPage'
import { TeacherLearnToolsPage } from './pages/TeacherLearnToolsPage'
import { PatentGamePiecePage } from './pages/PatentGamePiecePage'
import { PatentStickerPage } from './pages/PatentStickerPage'
import { PatentCustomPage } from './pages/PatentCustomPage'
import { JoinPage } from './pages/JoinPage'
import { ApprovalCelebrationHost } from './components/ApprovalCelebrationHost'
import { ApprovalCelebrationSync } from './components/ApprovalCelebrationSync'
import { TeacherSubmissionAlertHost } from './components/TeacherSubmissionAlertHost'
import { TeacherSubmissionAlertSync } from './components/TeacherSubmissionAlertSync'
import { StudentReviewAlertHost } from './components/StudentReviewAlertHost'
import { StudentReviewAlertSync } from './components/StudentReviewAlertSync'
import { PreferredFirstNameGate } from './components/PreferredFirstNameGate'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      {/* ========== Dev-only: not in production (`import.meta.env.DEV`) ========== */}
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
        {/* ========== Global: quest-approval toast + Realtime → localStorage bridge ========== */}
        <ApprovalCelebrationHost />
        <ApprovalCelebrationSync />
        <StudentReviewAlertHost />
        <StudentReviewAlertSync />
        <TeacherSubmissionAlertHost />
        <TeacherSubmissionAlertSync />
        <PreferredFirstNameGate />
        <Routes>
          {/* ========== Public / entry ========== */}
          <Route path="/" element={<HomeRoute />} />

          {/* ========== Student — guilds, economy, static pages ========== */}
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

          {/* ========== Student — program nav: Power Ups, Journey, Codex (+ legacy /portfolio) ========== */}
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
          {/* Legacy path from earlier naming — portfolio content lives on Codex now. */}
          <Route path="/portfolio" element={<Navigate to="/codex" replace />} />

          {/* ========== Student — patent packet flows (tile id in URL) ========== */}
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

          {/* ========== Auth & invites (no StudentOnly/Teacher wrapper on these paths) ========== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/join/:token" element={<JoinPage />} />

          {/* ========== Teacher — dashboard, approvals panel, utilities ========== */}
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
          <Route
            path="/teacher/shop"
            element={
              <TeacherDashboardRoute>
                <TeacherShopPage />
              </TeacherDashboardRoute>
            }
          />
          <Route
            path="/teacher/tools"
            element={
              <TeacherDashboardRoute>
                <TeacherToolGlossaryPage />
              </TeacherDashboardRoute>
            }
          />
          <Route
            path="/teacher/beyond"
            element={
              <TeacherDashboardRoute>
                <TeacherBeyondTilesPage />
              </TeacherDashboardRoute>
            }
          />
          <Route
            path="/teacher/learn"
            element={
              <TeacherDashboardRoute>
                <TeacherLearnToolsPage />
              </TeacherDashboardRoute>
            }
          />

          {/* ========== Unknown paths → home ========== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
