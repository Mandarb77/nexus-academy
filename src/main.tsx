/*
 * Nexus Academy — browser entry point
 *
 * Mounts the React app on `#root` and loads global styles. This file is the first
 * executable code in the student/teacher SPA; everything else flows through `App.tsx`
 * (routing, `AuthProvider`, celebration hosts). The `window.__NEXUS_NAV_LAYOUT_VERSION`
 * string exists so support staff can confirm in the browser console that the deployed
 * bundle matches the expected nav/Journey/Power Ups layout — useful when caching or
 * multiple dev servers make “which build am I on?” ambiguous.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/* Exposed for manual verification in dev tools (Safari/Firefox): type __NEXUS_NAV_LAYOUT_VERSION in the console. */
declare global {
  interface Window {
    __NEXUS_NAV_LAYOUT_VERSION?: string
  }
}
window.__NEXUS_NAV_LAYOUT_VERSION = '2-journey-powerups'

/* StrictMode double-invokes effects in development only — catches unsafe lifecycles without affecting production. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
