import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * UpdateNotification - displays a banner when a new service worker
 * is waiting to activate, prompting the user to refresh for updates.
 */
export default function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function onStateChange(registration) {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
      }
    }

    navigator.serviceWorker.ready.then((registration) => {
      // Check if there is already a waiting worker
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
      }

      // Listen for new service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              onStateChange(registration);
            }
          });
        }
      });
    });

    // Listen for controller change (new SW took over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [waitingWorker]);

  const handleDismiss = useCallback(() => {
    setShowUpdate(false);
  }, []);

  if (!showUpdate) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-propela-primary px-4 py-3 text-white shadow-lg"
    >
      <RefreshCw className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">
        A new version is available.
      </span>
      <button
        onClick={handleUpdate}
        className="rounded-md bg-white/20 px-3 py-1 text-sm font-semibold hover:bg-white/30 transition-colors"
      >
        Refresh
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss update notification"
        className="rounded-md p-1 hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
