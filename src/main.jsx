import './index.css'
import './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.jsx'
import ConfigError from './components/layout/ConfigError.jsx'
import { validateSupabaseConfig } from './lib/config'
import { captureException } from './lib/errorReporter'
import { isFeatureEnabled } from './lib/featureFlags'

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  captureException(event.reason || new Error('Unhandled promise rejection'), {
    component: 'global',
    severity: 'error',
    extra: { type: 'unhandledrejection' },
  })
})

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  captureException(event.error || new Error(event.message), {
    component: 'global',
    severity: 'fatal',
    extra: {
      type: 'uncaught_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  })
})

// Startup configuration gate (Req 7.3).
// When the Supabase backend is active, required Supabase config must be present
// before the main application mounts. If any required value is missing/empty we
// render the ConfigError screen instead of <App />, so the main app is never
// mounted and no data-layer / database calls are attempted.
// While the SUPABASE_BACKEND feature flag is disabled, the legacy localStorage
// path stays live and the gate does not block the app (Req 9.1).
const supabaseBackendEnabled = isFeatureEnabled('SUPABASE_BACKEND')
const supabaseConfig = validateSupabaseConfig()
const configBlocksStartup = supabaseBackendEnabled && !supabaseConfig.ok

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {configBlocksStartup ? <ConfigError missing={supabaseConfig.missing} /> : <App />}
  </StrictMode>,
)

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope)
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error)
      })
  })
}
