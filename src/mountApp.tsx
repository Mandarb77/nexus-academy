import { createRoot } from 'react-dom/client'
import App from './App.tsx'

export function mountApp() {
  /* StrictMode double-mounts auth effects and can refresh the same Google token twice. */
  createRoot(document.getElementById('root')!).render(<App />)
}
