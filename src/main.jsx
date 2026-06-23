import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import { captureException } from './lib/errorReporter'

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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
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
