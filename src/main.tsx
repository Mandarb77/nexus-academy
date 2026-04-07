import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/** Set as soon as this bundle loads — check in Safari/Firefox console: window.__NEXUS_NAV_LAYOUT_VERSION */
declare global {
  interface Window {
    __NEXUS_NAV_LAYOUT_VERSION?: string
  }
}
window.__NEXUS_NAV_LAYOUT_VERSION = '2-journey-powerups'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
